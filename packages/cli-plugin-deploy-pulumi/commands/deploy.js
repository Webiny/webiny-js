const path = require("path");
const { green } = require("chalk");
const execa = require("execa");
const { loadEnvVariables, getPulumi, processHooks, login, notify } = require("../utils");
const { getProjectApplication } = require("@webiny/cli/utils");

const SECRETS_PROVIDER = process.env.PULUMI_SECRETS_PROVIDER;

module.exports = async (inputs, context) => {
    const { env, folder, build } = inputs;

    // If folder not specified, that means we want to deploy the whole project (all project applications).
    // For that, we look if there are registered plugins that perform that.
    if (!folder) {
        const plugin = context.plugins.byName("cli-command-deployment-deploy-all");
        if (!plugin) {
            throw new Error(
                `Cannot continue - "cli-command-deployment-deploy-all" plugin not found.`
            );
        }

        return plugin.deploy(inputs, context);
    }

    if (!env) {
        throw new Error(`Please specify environment, for example "dev".`);
    }

    const start = new Date();
    const getDuration = () => {
        return (new Date() - start) / 1000;
    };

    // Get project application metadata.
    const projectApplication = getProjectApplication({ cwd: path.join(process.cwd(), folder) });

    if (build) {
        await execa(
            "yarn",
            [
                "webiny",
                "workspaces",
                "run",
                "build",
                "--folder",
                projectApplication.root,
                "--env",
                inputs.env,
                "--debug",
                Boolean(inputs.debug)
            ],
            {
                stdio: "inherit"
            }
        );
    }

    await loadEnvVariables(inputs, context);

    await login(projectApplication);
    const pulumi = await getPulumi({
        execa: {
            cwd: projectApplication.root
        }
    });

    let stackExists = true;
    try {
        await pulumi.run(
            { command: ["stack", "select", env] },
            {
                args: {
                    secretsProvider: SECRETS_PROVIDER
                }
            }
        );
    } catch (e) {
        stackExists = false;
    }

    if (!stackExists) {
        await pulumi.run(
            { command: ["stack", "init", env] },
            {
                args: {
                    secretsProvider: SECRETS_PROVIDER
                }
            }
        );
    }

    const isFirstDeploy = !stackExists;

    const hookDeployArgs = { isFirstDeploy, context, env, inputs, projectApplication };

    if (inputs.preview) {
        context.info(`Skipped "hook-before-deploy" hook.`);
    } else {
        context.info(`Running "hook-before-deploy" hook...`);
        await processHooks("hook-before-deploy", hookDeployArgs);

        const continuing = inputs.preview ? `Previewing deployment...` : `Deploying...`;
        context.success(`Hook "hook-before-deploy" completed. ${continuing}`);
    }

    console.log();

    if (inputs.preview) {
        await pulumi.run({
            command: "preview",
            args: {
                debug: inputs.debug
            },
            execa: {
                stdio: "inherit",
                env: {
                    WEBINY_ENV: env,
                    WEBINY_PROJECT_NAME: context.project.name
                }
            }
        });
    } else {
        await pulumi.run({
            command: "up",
            args: {
                yes: true,
                skipPreview: true,
                secretsProvider: SECRETS_PROVIDER,
                debug: inputs.debug
            },
            execa: {
                // We pipe "stderr" so that we can intercept potential received error messages,
                // and hopefully, show extra information / help to the user.
                stdio: ["inherit", "inherit", "pipe"],
                env: {
                    WEBINY_ENV: env,
                    WEBINY_PROJECT_NAME: context.project.name
                }
            }
        });
    }

    const duration = getDuration();
    if (inputs.preview) {
        context.success(`Done! Preview finished in ${green(duration + "s")}.`);
    } else {
        context.success(`Done! Deploy finished in ${green(duration + "s")}.`);
    }

    console.log();
    if (inputs.preview) {
        context.info(`Skipped "hook-after-deploy" hook.`);
    } else {
        context.info(`Running "hook-after-deploy" hook...`);
        await processHooks("hook-after-deploy", hookDeployArgs);
        context.success(`Hook "hook-after-deploy" completed.`);
    }

    notify({ message: `"${folder}" stack deployed in ${duration}s.` });
};

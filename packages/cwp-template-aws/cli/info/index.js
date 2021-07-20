const getStackOutput = require("@webiny/cli-plugin-deploy-pulumi/utils/getStackOutput");
const { green } = require("chalk");

const line = `-------------------------`;

const printEnvOutput = async (env, context) => {
    let output = await getStackOutput("api", env);

    console.log(line);
    console.log(
        [
            `Environment: ${green(env)}`,
            `AWS region: ${green(output.region ?? "not deployed yet")}`,
            `Project name: ${green(context.project.name)}`
        ].join("\n")
    );
    console.log(line);

    let stacksDeployedCount = 0;
    if (output) {
        stacksDeployedCount++;
        console.log(
            [
                `➜ Main GraphQL API: ${green(output.apiUrl + "/graphql")}`,
                `➜ Headless CMS GraphQL API:`,
                `   - Manage API: ${green(output.apiUrl + "/cms/manage/{LOCALE_CODE}")}`,
                `   - Read API: ${green(output.apiUrl + "/cms/read/{LOCALE_CODE}")}`,
                `   - Preview API: ${green(output.apiUrl + "/cms/preview/{LOCALE_CODE}")}`
            ].join("\n")
        );
    } else {
        context.info(`Stack ${green("api")} not deployed yet.`);
    }

    output = await getStackOutput("apps/admin", env);
    if (output) {
        stacksDeployedCount++;
        console.log([`➜ Admin app: ${green(output.appUrl)}`].join("\n"));
    } else {
        context.info(`Stack ${green("apps/admin")} not deployed yet.`);
    }

    output = await getStackOutput("apps/website", env);
    if (output) {
        stacksDeployedCount++;
        console.log(
            [
                `➜ Public website:`,
                `   - Website URL: ${green(output.deliveryUrl)}`,
                `   - Website preview URL: ${green(output.appUrl)}`
            ].join("\n")
        );
    } else {
        context.info(`Stack ${green("apps/website")} not deployed yet.`);
    }

    if (stacksDeployedCount === 0) {
        context.info("It seems none of the stacks were deployed, so no info could be provided.");
        context.info(`Please check if the provided environment ${green(env)} is correct.`);
    }

    console.log(line + "\n");
};

module.exports = {
    type: "cli-command",
    name: "cli-command-info",
    create({ yargs, context }) {
        yargs.command(
            "info",
            `Lists all relevant URLs for deployed project applications.`,
            yargs => {
                yargs.option("env", {
                    describe: `Environment`,
                    type: "string",
                    required: false
                });
                yargs.option("debug", {
                    describe: `Debug`,
                    type: "string"
                });
            },
            async args => {
                const { env } = args;

                if (!env) {
                    // Get all existing environments
                    const glob = require("fast-glob");
                    const pulumiFiles = await glob(["**/Pulumi.*.yaml"], {
                        cwd: context.project.root,
                        onlyFiles: true,
                        ignore: ["**/node_modules/**"]
                    });

                    const existingEnvs = new Set();
                    const regex = /Pulumi\.(\w+)\.yaml/;
                    pulumiFiles.forEach(file => {
                        if (file.match(regex)) {
                            existingEnvs.add(RegExp.$1);
                        }
                    });

                    for (const env of existingEnvs) {
                        await printEnvOutput(env, context);
                    }

                    return;
                }

                await printEnvOutput(env, context);
            }
        );
    }
};

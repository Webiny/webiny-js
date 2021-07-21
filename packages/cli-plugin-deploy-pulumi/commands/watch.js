const execa = require("execa");
const chalk = require("chalk");
const localtunnel = require("localtunnel");
const express = require("express");
const bodyParser = require("body-parser");
const { login, getPulumi, loadEnvVariables, getRandomColor } = require("../utils");
const { getProjectApplication } = require("@webiny/cli/utils");
const path = require("path");
const get = require("lodash/get");
const merge = require("lodash/merge");
const browserOutput = require("./watch/output/browserOutput");
const terminalOutput = require("./watch/output/terminalOutput");
const minimatch = require("minimatch");
const glob = require("fast-glob");

module.exports = async (inputs, context) => {
    // 1. Initial checks for deploy and build commands.
    if (!inputs.folder && !inputs.package) {
        throw new Error(
            `Either "folder" or "package" arguments must be passed. Cannot have both undefined.`
        );
    }

    let projectApplication;
    if (inputs.folder) {
        // Get project application metadata. Will throw an error if invalid folder specified.
        projectApplication = getProjectApplication({
            cwd: path.join(process.cwd(), inputs.folder)
        });

        // If exists - read default inputs from "webiny.application.js" file.
        inputs = merge({}, get(projectApplication, "config.cli.watch"), inputs);

        await loadEnvVariables(inputs, context);
    }

    inputs.build = inputs.build !== false;
    inputs.deploy = Boolean(projectApplication && inputs.deploy !== false);

    if (inputs.deploy && !inputs.env) {
        throw new Error(`Please specify environment, for example "dev".`);
    }

    if (!inputs.build && !inputs.deploy) {
        throw new Error(`Both re-build and re-deploy actions were disabled, can't continue.`);
    }

    if (inputs.deploy) {
        if (typeof inputs.logs === "string" && inputs.logs === "") {
            inputs.logs = "*";
        }
    }

    // 1.1. Check if the project application and Pulumi stack exist.
    let PULUMI_SECRETS_PROVIDER = process.env.PULUMI_SECRETS_PROVIDER;
    let PULUMI_CONFIG_PASSPHRASE = process.env.PULUMI_CONFIG_PASSPHRASE;

    if (inputs.deploy && projectApplication) {
        const { env } = inputs;

        await login(projectApplication);

        const pulumi = await getPulumi({
            execa: {
                cwd: projectApplication.root
            }
        });

        let stackExists = true;
        try {
            await pulumi.run({
                command: ["stack", "select", env],
                args: {
                    secretsProvider: PULUMI_SECRETS_PROVIDER
                },
                execa: {
                    env: {
                        PULUMI_CONFIG_PASSPHRASE
                    }
                }
            });
        } catch (e) {
            stackExists = false;
        }

        if (!stackExists) {
            throw new Error(`Please specify an existing environment, for example "dev".`);
        }
    }

    let output = inputs.output === "browser" ? browserOutput : terminalOutput;
    await output.initialize(inputs);

    const logging = {
        url: null
    };

    // Forward logs from the cloud to here, using the "localtunnel" library.
    if (inputs.logs) {
        try {
            const tunnel = await localtunnel({ port: 3010 });

            logging.url = tunnel.url;

            const app = express();
            app.use(bodyParser.urlencoded({ extended: false }));
            app.use(bodyParser.json());

            app.post("/", (req, res) => {
                if (Array.isArray(req.body)) {
                    req.body.forEach(consoleLog => {
                        printLog({
                            output,
                            consoleLog,
                            pattern: inputs.logs
                        });
                    });
                }
                res.send("Message received.");
            });

            app.listen(3010);

            [
                chalk.green(`Listening for incoming logs on port 3010...`),
                `Note: everything you log in your code will be forwarded here ${chalk.underline(
                    "over public internet"
                )}.`,
                `To learn more, please visit https://www.webiny.com/docs/how-to-guides/development/use-watch-command#enabling-logs-forwarding.`
            ].forEach(message => output.log({ type: "logs", message }));

            output.log({ type: "logs", message: "" });

            if (inputs.logs !== "*") {
                output.log({
                    type: "logs",
                    message: chalk.gray(
                        `Only showing logs that match the following pattern: ${inputs.logs}`
                    )
                });
            }
        } catch (e) {
            output.log({
                type: "logs",
                message: chalk.red(e.message)
            });
        }
    }

    // Add deploy logs.
    if (inputs.deploy && projectApplication) {
        try {
            output.log({
                type: "deploy",
                message: chalk.green("Watching cloud infrastructure resources...")
            });

            const pulumiFolder = path.join(projectApplication.root, "pulumi");

            const buildFoldersGlob = [
                projectApplication.project.root,
                inputs.folder,
                "**/build"
            ].join("/");
            const buildFolders = glob.sync(buildFoldersGlob, { onlyFiles: false });

            // The final array of values that will be sent to Pulumi CLI's "--path" argument.
            const pathArg = [pulumiFolder, ...buildFolders];

            // Log used values if debugging has been enabled.
            if (inputs.debug) {
                output.log({
                    type: "deploy",
                    message: [
                        "The following files and folders are being watched:",
                        ...pathArg.map(p => "‣ " + p)
                    ].join("\n")
                });
            }

            const pulumi = await getPulumi({
                execa: {
                    cwd: projectApplication.root
                }
            });

            // We only watch "code/**/build" and "pulumi" folders.
            const watchCloudInfrastructure = pulumi.run({
                command: "watch",
                args: {
                    secretsProvider: PULUMI_SECRETS_PROVIDER,
                    color: "always",
                    path: pathArg,
                    debug: inputs.debug
                },
                execa: {
                    env: {
                        WEBINY_ENV: inputs.env,
                        WEBINY_PROJECT_NAME: context.project.name,
                        WEBINY_LOGS_FORWARD_URL: logging.url
                    }
                }
            });

            watchCloudInfrastructure.stdout.on("data", data => {
                output.log({
                    type: "deploy",
                    message: data.toString()
                });
            });

            watchCloudInfrastructure.stderr.on("data", data => {
                output.log({
                    type: "deploy",
                    message: data.toString()
                });
            });

            // If logs are enabled, inform user that we're updating the WEBINY_LOGS_FORWARD_URL env variable.
            if (inputs.logs) {
                setTimeout(() => {
                    output.log({
                        type: "deploy",
                        message: `Logs enabled - updating ${chalk.gray(
                            "WEBINY_LOGS_FORWARD_URL"
                        )} environment variable...`
                    });
                }, 3000);
            }
        } catch (e) {
            output.log({
                type: "deploy",
                message: chalk.red(e.message)
            });
        }
    }

    // Add build logs.
    if (inputs.build) {
        try {
            output.log({
                type: "build",
                message: chalk.green("Watching packages...")
            });

            let packages = [];
            if (inputs.package) {
                packages = Array.isArray(inputs.package) ? inputs.package : [inputs.package];
            } else {
                packages = await execa("yarn", [
                    "webiny",
                    "workspaces",
                    "tree",
                    "--json",
                    "--depth",
                    inputs.depth,
                    "--distinct",
                    "--folder",
                    inputs.folder
                ]).then(({ stdout }) => JSON.parse(stdout));
            }

            const commandArgs = [
                "webiny",
                "workspaces",
                "run",
                "watch",
                ...packages.reduce((current, item) => {
                    current.push("--scope", item);
                    return current;
                }, [])
            ];

            if (inputs.env) {
                commandArgs.push("--env", inputs.env);
            }

            const watchPackages = execa("yarn", commandArgs, { env: { FORCE_COLOR: true } });

            watchPackages.stdout.on("data", data => {
                output.log({
                    type: "build",
                    message: data.toString()
                });
            });

            watchPackages.stderr.on("data", data => {
                output.log({
                    type: "build",
                    message: data.toString()
                });
            });

            context.onExit(() => {
                return new Promise(resolve => {
                    const kill = require("tree-kill");
                    kill(watchPackages.pid, "SIGTERM", () => {
                        resolve();
                    });
                });
            });
        } catch (e) {
            output.log({
                type: "build",
                message: chalk.red(e.message)
            });
        }
    }
};

let lastRequestId;
let lastTimestamp;
let color;

const printLog = ({ pattern = "*", consoleLog, output }) => {
    const { functionName, timestamp, requestId } = consoleLog.meta;
    if (lastRequestId !== requestId) {
        lastTimestamp = undefined;
        lastRequestId = requestId;
        // Generate a color for all logs in this request
        color = chalk.hex(getRandomColor());
        output.log({
            type: "logs",
            message: `---------- Request ID: ${color(requestId)} ----------`
        });
    }
    const time = new Date(timestamp).toISOString().split("T")[1];
    const message = consoleLog.args.join(" ").trim();
    let diff = "";
    if (lastTimestamp) {
        diff = `+${timestamp - lastTimestamp}ms`;
    }

    lastTimestamp = timestamp;

    if (message) {
        if (minimatch(functionName, pattern)) {
            output.log({
                type: "logs",
                message: `${time} ${color.bold(functionName)}: ${message} ${color(diff)}`
            });
        }
    }
};

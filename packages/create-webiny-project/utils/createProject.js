#!/usr/bin/env node
const { yellow, red, green } = require("chalk");
const execa = require("execa");
const fs = require("fs-extra");
const Listr = require("listr");
const path = require("path");
const writeJson = require("write-json-file");
const rimraf = require("rimraf");
const { sendEvent } = require("@webiny/tracking");
const getPackageJson = require("./getPackageJson");
const checkProjectName = require("./checkProjectName");
const yaml = require("js-yaml");
const getYarnVersion = require("./getYarnVersion");
const semver = require("semver");

module.exports = async function createProject({
    projectName,
    template,
    tag,
    log,
    interactive,
    templateOptions,
    assignToYarnrc: assignToYarnRc
}) {
    if (!projectName) {
        throw Error("You must provide a name for the project to use.");
    }

    const projectRoot = path.resolve(projectName).replace(/\\/g, "/");
    projectName = path.basename(projectRoot);

    if (fs.existsSync(projectRoot)) {
        console.log(`\nSorry, target folder ${red(projectName)} already exists!`);
        process.exit(1);
    }

    // Check if @webiny/cli is installed globally and warn user
    try {
        await execa("npm", ["list", "-g", "@webiny/cli"]);
        console.log(
            [
                "",
                "🚨 IMPORTANT NOTICE:",
                "----------------------------------------",
                `We've detected a global installation of ${green(
                    "@webiny/cli"
                )}. This might not play well with your new project.`,
                `We recommend you do one of the following things:\n`,
                ` - uninstall the global @webiny/cli package by running ${green(
                    "npm rm -g @webiny/cli"
                )} or`,
                ` - run webiny commands using ${green(
                    "yarn webiny"
                )} so that the package is always resolved to your project dependencies\n`,
                `The second option is also recommended if you have an older version of Webiny project you want to keep using.`,
                "----------------------------------------",
                ""
            ].join("\n")
        );
    } catch (err) {
        // @webiny/cli is not installed globally
    }

    console.log(`Initializing a new Webiny project in ${green(projectRoot)}...`);

    await sendEvent({ event: "create-webiny-project-start" });

    let isGitAvailable = false;
    try {
        await execa("git", ["--version"]);
        isGitAvailable = true;
    } catch {
        // Git is not available.
    }

    const tasks = new Listr(
        [
            {
                // Creates root package.json.
                title: "Prepare project folder",
                task: () => {
                    checkProjectName(projectName);
                    fs.ensureDirSync(projectName);
                    writeJson.sync(
                        path.join(projectRoot, "package.json"),
                        getPackageJson(projectName)
                    );
                }
            },
            {
                // Setup yarn@2
                title: "Setup yarn@^2",
                task: async () => {
                    const yarnVersion = await getYarnVersion();
                    if (semver.satisfies(yarnVersion, "^1.22.0")) {
                        await execa("yarn", ["set", "version", "berry"], { cwd: projectRoot });
                    }

                    fs.copySync(
                        path.join(__dirname, "files", "example.yarnrc.yml"),
                        path.join(projectRoot, ".yarnrc.yml"),
                        { overwrite: true }
                    );

                    // Enables adding additional params into the `.yarnrc.yml` file.
                    if (assignToYarnRc) {
                        let parsedAssignToYarnRc;
                        try {
                            parsedAssignToYarnRc = JSON.parse(assignToYarnRc);
                        } catch {
                            console.log(
                                yellow("Warning: could not parse provided --assign-to-yarnrc JSON.")
                            );
                        }

                        if (parsedAssignToYarnRc) {
                            const yamlPath = path.join(projectRoot, ".yarnrc.yml");
                            const parsedYaml = yaml.load(fs.readFileSync(yamlPath, "utf-8"));
                            Object.assign(parsedYaml, parsedAssignToYarnRc);
                            fs.writeFileSync(yamlPath, yaml.dump(parsedYaml));
                        }
                    }
                }
            },
            {
                // "yarn adds" given template which can be either a real package or a path of a local package.
                title: `Install template package`,
                task: async context => {
                    let add;
                    let templateName = `@webiny/cwp-template-${template}`;

                    if (template.startsWith(".") || template.startsWith("file:")) {
                        templateName =
                            "file:" + path.relative(projectName, template.replace("file:", ""));
                        add = templateName;
                    } else {
                        add = `${templateName}@${tag}`;
                    }

                    // Assign template name to context.
                    context.templateName = templateName;

                    await execa("yarn", ["add", add], { cwd: projectRoot });
                }
            },
            isGitAvailable
                ? {
                      // Initialize `git` by executing `git init` in project directory.
                      title: `Initialize git`,
                      task: (ctx, task) => {
                          try {
                              execa.sync("git", ["--version"]);
                              execa.sync("git", ["init"], { cwd: projectRoot });
                              fs.writeFileSync(
                                  path.join(projectRoot, ".gitignore"),
                                  "node_modules/"
                              );
                          } catch (err) {
                              task.skip("Git repo not initialized", err);
                          }
                      }
                  }
                : null
        ].filter(Boolean)
    );

    // The `context` object will be filled with additional values in the `tasks.run` process.
    const context = {};

    try {
        await tasks.run(context);

        let templateName = context.templateName;

        console.log(`Starting ${green(templateName)} template ...`);
        if (templateName.startsWith("file:")) {
            templateName = templateName.replace("file:", "");
        }

        const templatePath = path.dirname(
            require.resolve(path.join(templateName, "package.json"), {
                paths: [projectRoot]
            })
        );

        await new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 500);
        });

        let parsedTemplateOptions = {};
        if (templateOptions) {
            try {
                parsedTemplateOptions = JSON.parse(templateOptions);
            } catch {
                console.log(yellow("Warning: could not parse provided --template-options JSON."));
            }
        }

        console.log();
        await require(templatePath)({
            log,
            isGitAvailable,
            projectName,
            projectRoot,
            interactive,
            templateOptions: parsedTemplateOptions
        });

        await sendEvent({ event: "create-webiny-project-end" });
    } catch (err) {
        await sendEvent({
            event: "create-webiny-project-error",
            data: {
                errorMessage: err.message,
                errorStack: err.stack
            }
        });

        console.log(
            [
                "",
                "ERROR OUTPUT:",
                "----------------------------------------",
                err.message,
                "----------------------------------------",
                "",
                "Please open an issue including the error output at https://github.com/webiny/webiny-js/issues/new.",
                "You can also get in touch with us on our Slack Community: https://www.webiny.com/slack",
                ""
            ].join("\n")
        );

        console.log(`Writing log to ${green(path.resolve(log))}...`);
        fs.writeFileSync(path.resolve(log), err.toString());
        console.log("Cleaning up project...");
        rimraf.sync(projectRoot);
        console.log("Project cleaned!");

        await sendEvent({ event: "create-webiny-project-end" });
        process.exit(1);
    }
};

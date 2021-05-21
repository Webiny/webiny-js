import {
    CliCommandScaffoldTemplate,
    TsConfigJson,
    PackageJson
} from "@webiny/cli-plugin-scaffold/types";
import fs from "fs";
import path from "path";
import util from "util";
import ncpBase from "ncp";
import readJson from "load-json-file";
import writeJson from "write-json-file";
import pluralize from "pluralize";
import Case from "case";
import { replaceInPath } from "replace-in-path";
import chalk from "chalk";
import indentString from "indent-string";
import WebinyError from "@webiny/error";
import execa from "execa";
import validateNpmPackageName from "validate-npm-package-name";
import { getProject } from "@webiny/cli/utils";

const ncp = util.promisify(ncpBase.ncp);

interface Input {
    location: string;
    entityName: string;
    packageName?: string;
}

const adminAppCodePath = "apps/admin/code";
const adminAppPluginsIndexFile = `${adminAppCodePath}/src/plugins/index.ts`;

const createPackageName = ({
    initial,
    location
}: {
    initial?: string;
    location: string;
}): string => {
    if (initial) {
        return initial;
    }
    return Case.kebab(location);
};

export default (): CliCommandScaffoldTemplate<Input> => ({
    name: "cli-plugin-scaffold-template-graphql-app",
    type: "cli-plugin-scaffold-template",
    scaffold: {
        name: "Admin Area package",
        questions: () => {
            return [
                {
                    name: "entityName",
                    message: "Enter the name of the initial data model",
                    default: "Book",
                    validate: name => {
                        if (!name.match(/^([a-zA-Z]+)$/)) {
                            return "A valid entity name must consist of letters only.";
                        }

                        return true;
                    }
                },
                {
                    name: "location",
                    message: `Enter the package location`,
                    default: answers => {
                        const entityNamePlural = pluralize(Case.kebab(answers.entityName));
                        return `packages/${entityNamePlural}/admin-app`;
                    },
                    validate: location => {
                        if (!location) {
                            return "Please enter the package location.";
                        }

                        const locationPath = path.resolve(location);
                        if (fs.existsSync(locationPath)) {
                            return `The target location already exists "${location}".`;
                        }

                        return true;
                    }
                },
                {
                    name: "packageName",
                    message: "Enter the package name",
                    default: answers => {
                        const entityNamePlural = pluralize(Case.kebab(answers.entityName));
                        return `@${entityNamePlural}/admin-app`;
                    },
                    validate: packageName => {
                        if (!packageName) {
                            return true;
                        } else if (validateNpmPackageName(packageName)) {
                            return true;
                        }
                        return `Package name must look something like "@package/my-generated-package".`;
                    }
                }
            ];
        },
        generate: async ({ input, ora }) => {
            const { entityName, location, packageName: initialPackageName } = input;

            const fullLocation = path.resolve(location);
            const packageName = createPackageName({
                initial: initialPackageName,
                location
            });

            // Then we also copy the template folder
            const sourcePath = path.join(__dirname, "template");

            if (fs.existsSync(fullLocation)) {
                throw new WebinyError(`Destination folder ${fullLocation} already exists.`);
            }

            const project = getProject({
                cwd: fullLocation
            });

            const locationRelative = path.relative(project.root, fullLocation);

            const relativeRootPath = path.relative(fullLocation, project.root);

            const baseTsConfigFullPath = path.resolve(project.root, "tsconfig.json");
            const baseTsConfigRelativePath = path.relative(fullLocation, baseTsConfigFullPath);

            const baseTsConfigBuildJsonPath = baseTsConfigFullPath.replace(
                "tsconfig.json",
                "tsconfig.build.json"
            );
            const baseTsConfigBuildRelativePath = path.relative(
                fullLocation,
                baseTsConfigBuildJsonPath
            );
            const baseTsConfigBuildJson = await readJson<TsConfigJson>(baseTsConfigBuildJsonPath);

            ora.start(`Creating new Admin app module files in ${chalk.green(fullLocation)}...`);

            await fs.mkdirSync(fullLocation, { recursive: true });

            // Copy template files
            await ncp(sourcePath, fullLocation);

            // Replace generic "Entity" with received "input.entityName" or "input.newEntityName" argument.
            const entity = {
                plural: pluralize(Case.camel(entityName)),
                singular: pluralize.singular(Case.camel(entityName))
            };

            const codeReplacements = [
                { find: "targets", replaceWith: Case.camel(entity.plural) },
                { find: "Targets", replaceWith: Case.pascal(entity.plural) },
                { find: "TARGETS", replaceWith: Case.constant(entity.plural) },
                { find: "target", replaceWith: Case.camel(entity.singular) },
                { find: "Target", replaceWith: Case.pascal(entity.singular) },
                { find: "TARGET", replaceWith: Case.constant(entity.singular) },
                { find: "RELATIVE_ROOT_PATH", replaceWith: relativeRootPath.replace(/\\/g, "/") }
            ];

            replaceInPath(path.join(fullLocation, ".babelrc.js"), codeReplacements);
            replaceInPath(path.join(fullLocation, "**/*.ts"), codeReplacements);
            replaceInPath(path.join(fullLocation, "**/*.tsx"), codeReplacements);

            // Make sure to also rename base file names.
            const fileNameReplacements = [
                {
                    find: "src/views/TargetsDataList.tsx",
                    replaceWith: `src/views/${Case.pascal(entity.plural)}DataList.tsx`
                },
                {
                    find: "src/views/Targets.tsx",
                    replaceWith: `src/views/${Case.pascal(entity.plural)}.tsx`
                },
                {
                    find: "src/views/TargetForm.tsx",
                    replaceWith: `src/views/${Case.pascal(entity.singular)}Form.tsx`
                }
            ];

            for (const key in fileNameReplacements) {
                if (!fileNameReplacements.hasOwnProperty(key)) {
                    continue;
                }
                const fileNameReplacement = fileNameReplacements[key];
                fs.renameSync(
                    path.join(fullLocation, fileNameReplacement.find),
                    path.join(fullLocation, fileNameReplacement.replaceWith)
                );
            }

            // Generated package file changes
            ora.start(`Setting package name...`);
            const packageJsonFile = path.resolve(fullLocation, "package.json");
            const packageJson = readJson.sync<PackageJson>(packageJsonFile);
            packageJson.name = packageName;

            const { version } = require("@webiny/cli-plugin-scaffold/package.json");

            // Inject Webiny packages version
            Object.keys(packageJson.dependencies).forEach(name => {
                if (name.startsWith("@webiny")) {
                    packageJson.dependencies[name] = version;
                }
            });

            Object.keys(packageJson.devDependencies).forEach(name => {
                if (name.startsWith("@webiny")) {
                    packageJson.devDependencies[name] = version;
                }
            });

            await writeJson(packageJsonFile, packageJson);
            ora.stopAndPersist({
                symbol: chalk.green("✔"),
                text: "Package name set."
            });
            ora.start(`Setting tsconfig.json extends path...`);
            const packageTsConfigFilePath = path.resolve(fullLocation, "tsconfig.json");
            const packageTsConfig = readJson.sync<TsConfigJson>(packageTsConfigFilePath);
            packageTsConfig.extends = baseTsConfigRelativePath;
            await writeJson(packageTsConfigFilePath, packageTsConfig);
            ora.stopAndPersist({
                symbol: chalk.green("✔"),
                text: "tsconfig.json extends set."
            });
            ora.start(`Setting tsconfig.build.json extends path...`);
            const packageTsConfigBuildFilePath = path.resolve(fullLocation, "tsconfig.build.json");
            const packageTsConfigBuild = readJson.sync<TsConfigJson>(packageTsConfigBuildFilePath);
            packageTsConfigBuild.extends = baseTsConfigBuildRelativePath;
            await writeJson(packageTsConfigBuildFilePath, packageTsConfigBuild);
            ora.stopAndPersist({
                symbol: chalk.green("✔"),
                text: "tsconfig.build.json extends set."
            });

            // Add package to workspaces
            const rootPackageJsonPath = path.join(project.root, "package.json");
            const rootPackageJson = await readJson<PackageJson>(rootPackageJsonPath);
            if (!rootPackageJson.workspaces.packages.includes(location)) {
                rootPackageJson.workspaces.packages.push(location);
                await writeJson(rootPackageJsonPath, rootPackageJson);
            }

            // Update root tsconfig.build.json file paths
            ora.start(`Updating base tsconfig compilerOptions.paths to contain the package...`);
            if (!baseTsConfigBuildJson.compilerOptions) {
                baseTsConfigBuildJson.compilerOptions = {};
            }
            baseTsConfigBuildJson.compilerOptions.paths[`${packageName}`] = [
                `./${locationRelative}/src`
            ];
            baseTsConfigBuildJson.compilerOptions.paths[`${packageName}/*`] = [
                `./${locationRelative}/src/*`
            ];
            await writeJson(baseTsConfigBuildJsonPath, baseTsConfigBuildJson);
            ora.stopAndPersist({
                symbol: chalk.green("✔"),
                text: `Updated base tsconfig compilerOptions.paths.`
            });

            const adminAppPackageJsonPath = path.resolve(adminAppCodePath, "package.json");
            const adminAppPackageJson = await readJson<PackageJson>(adminAppPackageJsonPath);
            adminAppPackageJson.dependencies[packageName] = "^1.0.0";
            await writeJson(adminAppPackageJsonPath, adminAppPackageJson);

            ora.stopAndPersist({
                symbol: chalk.green("✔"),
                text: `Added ${chalk.green(packageName)} to api package.json.`
            });

            ora.stopAndPersist({
                symbol: chalk.green("✔"),
                text: `Admin app module files created in ${chalk.green(fullLocation)}.`
            });

            // Once everything is done, run `yarn` so the new packages are automatically installed.
            try {
                ora.start(`Installing dependencies...`);
                await execa("yarn");
                ora.stopAndPersist({
                    symbol: chalk.green("✔"),
                    text: "Dependencies installed."
                });
                ora.start(`Building generated package...`);
                const cwd = process.cwd();
                process.chdir(fullLocation);
                await execa("yarn", ["build"]);
                process.chdir(cwd);
                ora.stopAndPersist({
                    symbol: chalk.green("✔"),
                    text: "Package built."
                });
                ora.start(`Linking package...`);
                await execa("yarn", ["postinstall"]);
                ora.stopAndPersist({
                    symbol: chalk.green("✔"),
                    text: "Package linked."
                });
            } catch (err) {
                throw new WebinyError(
                    `Unable to install dependencies. Try running "yarn" in project root manually.`,
                    err.message
                );
            }
        },
        onSuccess: async ({ input }) => {
            const { entityName, location, packageName: initialPackageName } = input;

            const entity = {
                singular: Case.camel(entityName),
                plural: pluralize(Case.camel(entityName))
            };
            const packageName = createPackageName({
                initial: initialPackageName,
                location
            });

            const adminAppPluginsIndexFileRelativePath = path.relative(
                process.cwd(),
                adminAppPluginsIndexFile
            );

            console.log(
                "Note: in order to see your new module in the Admin app, you must register the generated plugins:"
            );

            console.log(
                indentString(
                    `1. Open ${chalk.green(adminAppPluginsIndexFileRelativePath)} file.`,
                    2
                )
            );
            console.log(
                indentString(
                    `2. Import and pass the generated plugin to the registration array.`,
                    2
                )
            );
            console.log(
                indentString(
                    chalk.green(`
// at the top of the file
import ${entity.singular}Plugin from "${packageName}";

// in the end of the registration array
${entity.singular}Plugin()
`),
                    2
                )
            );

            console.log(
                indentString(
                    `3. Deploy the ${chalk.green(packageName)} by running ${chalk.green(
                        `yarn webiny deploy apps/admin --env=dev`
                    )}.`,
                    2
                )
            );

            console.log(
                "Learn more about app development at https://www.webiny.com/docs/tutorials/create-an-application/admin-area-package."
            );
        }
    }
});

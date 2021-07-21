const util = require("util");
const getPulumi = require("../utils/getPulumi");
const trimEnd = require("lodash/trimEnd");
const fs = require("fs");
const { relative, join } = require("path");
const ncpBase = require("ncp");
const ncp = util.promisify(ncpBase.ncp);
const chalk = require("chalk");
const rimraf = require("rimraf");
const { log } = require("@webiny/cli/utils");

// To use a self-managed backend, specify a storage endpoint URL as pulumi login’s <backend-url> argument:
// s3://<bucket-path>, azblob://<container-path>, gs://<bucket-path>, or file://<fs-path>.
// This will tell Pulumi to store state in AWS S3, Azure Blob Storage, Google Cloud Storage, or the
// local filesystem, respectively.
// @see https://www.pulumi.com/docs/intro/concepts/state/#logging-into-the-pulumi-service-backend
const SELF_MANAGED_BACKEND = ["s3://", "azblob://", "gs://"];

module.exports = async projectApplication => {
    // Backwards compatibility, for < 5.5.0 projects.
    await copyStateFilesToProjectRoot(projectApplication);

    // Do the login with Pulumi CLI.
    const pulumi = await getPulumi({
        execa: {
            cwd: projectApplication.root
        }
    });

    const relativeProjectApplicationPath = relative(
        projectApplication.project.root,
        projectApplication.root
    );

    // A couple of variations here, just to preserve backwards compatibility.
    let login =
        process.env.WEBINY_PULUMI_BACKEND ||
        process.env.WEBINY_PULUMI_BACKEND_URL ||
        process.env.PULUMI_LOGIN;

    if (login) {
        // If the user passed `s3://my-bucket`, we want to store files in `s3://my-bucket/{project-application-path}`
        const selfManagedBackend = SELF_MANAGED_BACKEND.find(item => login.startsWith(item));
        if (selfManagedBackend) {
            login = trimEnd(login, "/") + "/" + relativeProjectApplicationPath;
            login = login.replace(/\\/g, "/");
        }
    } else {
        // By default, we use local file system as backend. All files are stored in project root's
        // `.pulumi` folder, e.g. `.pulumi/apps/admin`.
        const stateFilesFolder = join(
            projectApplication.project.root,
            ".pulumi",
            relativeProjectApplicationPath
        );

        if (!fs.existsSync(stateFilesFolder)) {
            fs.mkdirSync(stateFilesFolder, { recursive: true });
        }

        login = `file://${stateFilesFolder}`;
    }

    await pulumi.run({
        command: ["login", login]
    });

    return { login };
};

/**
 * If existing, let's move all of the state files into the project root's ".pulumi" relativePathFromProjectRoot.
 * This way we maintain backwards compatibility and no extra steps from users are needed.
 */
const copyStateFilesToProjectRoot = async projectApplication => {
    const relativeProjectApplicationPath = getProjectApplicationRelativePath(projectApplication);
    const oldStateFolder = join(projectApplication.root, ".pulumi");
    if (fs.existsSync(oldStateFolder)) {
        const stateFolder = join(
            projectApplication.project.root,
            ".pulumi",
            relativeProjectApplicationPath,
            ".pulumi"
        );

        log.info(
            `Detected ${chalk.green(".pulumi")} folder in the ${chalk.green(
                projectApplication.name
            )} project application (${chalk.green(projectApplication.root)}).`
        );

        log.info(`Moving the folder to project root (${chalk.green(stateFolder)}).`);

        if (!fs.existsSync(stateFolder)) {
            fs.mkdirSync(stateFolder, { recursive: true });
        } else {
            throw new Error(`Cannot continue, folder ${chalk.green(stateFolder)} is not empty.`);
        }

        await ncp(oldStateFolder, stateFolder);

        rimraf.sync(join(oldStateFolder));

        log.info(
            `To learn more, please visit https://www.webiny.com/docs/how-to-guides/upgrade-webiny/5.4.0-to-5.5.0#moved-pulumi-folders-to-project-root.`
        );
    }
};

const getProjectApplicationRelativePath = projectApplication => {
    return relative(projectApplication.project.root, projectApplication.root);
};

const os = require("os");
const tar = require("tar");
const fs = require("fs");
const download = require("download");
const path = require("path");
const decompress = require("decompress");

export default async (downloadFolder, beforeInstall, afterInstall) => {
    if (fs.existsSync(downloadFolder)) {
        return false;
    }

    if (typeof beforeInstall === "function") {
        await beforeInstall();
    }

    const platform = os.platform();
    switch (platform) {
        case "darwin":
            await setupDarwin(downloadFolder);
            break;
        case "linux":
            await setupLinux(downloadFolder);
            break;
        case "win32":
            await setupWindows(downloadFolder);
            break;
        default:
            throw Error(
                `Cannot download Pulumi binaries - platform "${platform}" not supported. Supported ones are "darwin", "linux", and "win32"`
            );
    }

    if (typeof afterInstall === "function") {
        await afterInstall();
    }

    return true;
};

async function setupDarwin(downloadFolder) {
    const { version } = require("@pulumi/pulumi/package.json");
    const filename = `pulumi-v${version}-darwin-x64.tar.gz`;
    const downloadUrl = "https://get.pulumi.com/releases/sdk/" + filename;

    await download(downloadUrl, downloadFolder);

    await tar.extract({
        cwd: downloadFolder,
        file: path.join(downloadFolder, filename)
    });

    fs.unlinkSync(path.join(downloadFolder, filename));
}

async function setupWindows(downloadFolder) {
    const { version } = require("@pulumi/pulumi/package.json");
    const filename = `pulumi-v${version}-windows-x64.zip`;
    const downloadUrl = "https://get.pulumi.com/releases/sdk/" + filename;

    await download(downloadUrl, downloadFolder);

    const archive = path.join(downloadFolder, filename);
    const destination = path.join(downloadFolder, "pulumi");
    await decompress(archive, destination, { strip: 2 });

    fs.unlinkSync(path.join(downloadFolder, filename));
}

async function setupLinux(downloadFolder) {
    const { version } = require("@pulumi/pulumi/package.json");
    const filename = `pulumi-v${version}-linux-x64.tar.gz`;
    const downloadUrl = "https://get.pulumi.com/releases/sdk/" + filename;

    await download(downloadUrl, downloadFolder);

    await tar.extract({
        cwd: downloadFolder,
        file: path.join(downloadFolder, filename)
    });

    fs.unlinkSync(path.join(downloadFolder, filename));
}

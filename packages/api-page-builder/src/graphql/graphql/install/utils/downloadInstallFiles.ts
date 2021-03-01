import fs from "fs-extra";
import extract from "extract-zip";
import path from "path";
import rimraf from "rimraf";
import S3 from "aws-sdk/clients/s3";
import download from "./download";

const PAGE_BUILDER_S3_BUCKET = process.env.S3_BUCKET;
const PAGE_BUILDER_INSTALLATION_FILES_ZIP_KEY = "pbInstallation.zip";

function extractZip(zipPath, dir) {
    return new Promise((resolve, reject) => {
        extract(zipPath, { dir }, e => {
            if (e) {
                reject(e);
                return;
            }
            // @ts-ignore
            resolve();
        });
    });
}

function deleteFile(path) {
    return new Promise((resolve, reject) => {
        rimraf(path, e => {
            if (e) {
                reject(e);
                return;
            }
            // @ts-ignore
            resolve();
        });
    });
}

const INSTALL_DIR = "/tmp";
const INSTALL_ZIP_PATH = path.join(INSTALL_DIR, "apiPageBuilder.zip");
const INSTALL_EXTRACT_DIR = path.join(INSTALL_DIR, "apiPageBuilder");

export default async () => {
    const s3 = new S3({ region: process.env.AWS_REGION });
    const installationFilesUrl = await s3.getSignedUrlPromise("getObject", {
        Bucket: PAGE_BUILDER_S3_BUCKET,
        Key: PAGE_BUILDER_INSTALLATION_FILES_ZIP_KEY
    });

    fs.ensureDirSync(INSTALL_DIR);
    await download(installationFilesUrl, INSTALL_ZIP_PATH);

    await extractZip(INSTALL_ZIP_PATH, INSTALL_EXTRACT_DIR);
    await deleteFile(INSTALL_ZIP_PATH);

    return INSTALL_EXTRACT_DIR;
};

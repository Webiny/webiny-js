const fetch = require("node-fetch");
const pRetry = require("p-retry");
const semver = require("semver");
const execa = require("execa");

function getPackageVersion(name, tag = "latest") {
    const getVersion = async () => {
        const { stdout: registry } = await execa("npm", ["config", "get", "registry"]);
        const res = await fetch(`${registry}${name}`);
        const json = await res.json();

        const tagVersion = json["dist-tags"][tag];
        if (!tagVersion || semver.lte(tagVersion, json["dist-tags"]["latest"])) {
            return json["dist-tags"]["latest"];
        }

        return tagVersion;
    };

    return pRetry(getVersion, { retries: 5 });
}

module.exports = { getPackageVersion };

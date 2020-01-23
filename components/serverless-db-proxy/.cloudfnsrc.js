const aliases = require("@webiny/project-utils/aliases");
const packages = require("@webiny/project-utils/packages");

module.exports = {
    name: "sls-db-proxy",
    plugins: ["aws-lambda"],
    webpack: ({ config, setEntry, setOutput }) => {
        setEntry("handler.js");
        setOutput("handler.js");
        config.module.rules[0].options.babelrc = true;
        config.module.rules[0].options.babelrcRoots = packages;
        config.module.rules[0].options.presets.push("@babel/preset-typescript");
        config.module.rules[0].options.plugins.push(
            "@babel/plugin-proposal-export-default-from",
            "@babel/plugin-proposal-class-properties",
            ["babel-plugin-module-resolver", { alias: aliases }]
        );
    }
};

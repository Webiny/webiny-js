const { watchPackage, buildPackage } = require("@webiny/project-utils");

module.exports = {
    commands: {
        build: buildPackage,
        watch: watchPackage
    }
};

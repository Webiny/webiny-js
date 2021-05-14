const run = require("./run");
const tracking = require("./tracking");
const upgrade = require("./upgrade");

module.exports.createCommands = async (yargs, context) => {
    context.plugins.register(run, tracking, upgrade);

    await context.loadUserPlugins();

    context.plugins.byType("cli-command").forEach(plugin => {
        plugin.create({ yargs, context });
    });
};

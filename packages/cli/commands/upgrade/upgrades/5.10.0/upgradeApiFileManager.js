const tsMorph = require("ts-morph");
const importPath = "@webiny/api-file-manager-ddb-es";
const importedVariableName = "fileManagerDynamoDbElasticPlugins";

const upgradeGraphQLIndex = async ({ source, file, context }) => {
    const { info } = context;
    info(`Upgrading ${info.hl(file)}`);

    const fileManagerDynamoDbElasticPluginsImport = source.getImportDeclaration(importPath);
    if (fileManagerDynamoDbElasticPluginsImport) {
        info(`Import ${info.hl(importPath)} already exists in ${info.hl(file)}.`);
        return;
    }
    const lastImport = source.getImportDeclarations().pop();
    if (!lastImport) {
        throw new Error(`Missing imports in "${file}".`);
    }

    source.insertImportDeclaration(lastImport.getChildIndex() + 1, {
        defaultImport: importedVariableName,
        moduleSpecifier: importPath
    });

    // Try fetching plugins from handler config object
    const plugins = source.getFirstDescendant(
        node => tsMorph.Node.isPropertyAssignment(node) && node.getName() === "plugins"
    );

    if (!plugins) {
        throw new Error(
            `Cannot upgrade the "api/code/graphql/index.ts" because it seems it's an old version of the code.`
        );
    }
    /**
     * Find the position of the file manager plugins in the createHandler.plugins array.
     */
    const fileManagerPlugins = plugins
        .getInitializer()
        .getElements()
        .findIndex(node => {
            return (
                tsMorph.Node.isCallExpression(node) &&
                node.getExpression().getText() === "fileManagerPlugins"
            );
        });
    if (!fileManagerPlugins) {
        throw new Error(
            `Could not find "fileManagerPlugins()" in the "api/code/graphql/index.ts" createHandler.plugins array.`
        );
    }
    /**
     * Add new the DynamoDB/Elasticsearch plugins to the array of plugins.
     */
    plugins.getInitializer().insertElement(fileManagerPlugins, `${importedVariableName}()`);
    info(`Upgrade done.`);
};

module.exports = {
    upgradeGraphQLIndex
};

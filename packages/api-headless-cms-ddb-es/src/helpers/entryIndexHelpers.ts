import Error from "@webiny/error";
import {
    CmsContentEntry,
    CmsContentModel,
    CmsContext,
    CmsModelFieldToGraphQLPlugin
} from "@webiny/api-headless-cms/types";
import { CmsContentIndexEntry, CmsModelFieldToElasticsearchPlugin } from "~/types";

interface SetupEntriesIndexHelpersArgs {
    context: CmsContext;
}

interface ExtractEntriesFromIndexArgs extends SetupEntriesIndexHelpersArgs {
    model: CmsContentModel;
    entries: CmsContentIndexEntry[];
}

interface PrepareElasticsearchDataArgs extends SetupEntriesIndexHelpersArgs {
    model: CmsContentModel;
    originalEntry: CmsContentEntry;
    storageEntry: CmsContentEntry;
}

export const prepareEntryToIndex = (args: PrepareElasticsearchDataArgs): CmsContentIndexEntry => {
    const { context, storageEntry, originalEntry, model } = args;
    const {
        fieldIndexPlugins,
        defaultIndexFieldPlugin,
        fieldTypePlugins
    } = setupEntriesIndexHelpers({ context });

    function getFieldIndexPlugin(fieldType: string) {
        return fieldIndexPlugins[fieldType] || defaultIndexFieldPlugin;
    }

    function getFieldTypePlugin(fieldType: string) {
        return fieldTypePlugins[fieldType];
    }

    // These objects will contain values processed by field index plugins
    const values = {};
    const rawValues = {};

    // We're only interested in current model fields.
    for (const field of model.fields) {
        if (storageEntry.values.hasOwnProperty(field.fieldId) === false) {
            continue;
        }

        const fieldTypePlugin = getFieldTypePlugin(field.type);
        if (!fieldTypePlugin) {
            throw new Error(`Missing field type plugin "${field.type}".`);
        }

        const targetFieldPlugin = getFieldIndexPlugin(field.type);

        // TODO: remove this `if` once we convert this plugin to proper plugin class
        if (targetFieldPlugin && targetFieldPlugin.toIndex) {
            const { value, rawValue } = targetFieldPlugin.toIndex({
                context,
                model,
                field,
                rawValue: originalEntry.values[field.fieldId],
                storageValue: storageEntry.values[field.fieldId],
                getFieldIndexPlugin,
                getFieldTypePlugin
            });

            if (typeof value !== "undefined") {
                values[field.fieldId] = value;
            }

            if (typeof rawValue !== "undefined") {
                rawValues[field.fieldId] = rawValue;
            }
        }
    }
    return {
        ...storageEntry,
        values,
        rawValues
    } as CmsContentIndexEntry;
};

const setupEntriesIndexHelpers = ({ context }: SetupEntriesIndexHelpersArgs) => {
    const plugins = context.plugins.byType<CmsModelFieldToElasticsearchPlugin>(
        "cms-model-field-to-elastic-search"
    );

    const fieldIndexPlugins: Record<string, CmsModelFieldToElasticsearchPlugin> = {};
    for (const plugin of plugins.reverse()) {
        if (fieldIndexPlugins[plugin.fieldType]) {
            continue;
        }
        fieldIndexPlugins[plugin.fieldType] = plugin;
    }
    // we will use this plugin if no targeted plugin found
    const defaultIndexFieldPlugin = plugins.find(plugin => plugin.fieldType === "*");

    // CmsModelFieldToGraphQLPlugin plugins
    const fieldTypePlugins: Record<string, CmsModelFieldToGraphQLPlugin> = context.plugins
        .byType<CmsModelFieldToGraphQLPlugin>("cms-model-field-to-graphql")
        .reduce((plugins, plugin) => ({ ...plugins, [plugin.fieldType]: plugin }), {});

    return {
        fieldIndexPlugins,
        defaultIndexFieldPlugin,
        fieldTypePlugins
    };
};

export const extractEntriesFromIndex = ({
    context,
    entries,
    model
}: ExtractEntriesFromIndexArgs): CmsContentEntry[] => {
    const {
        fieldIndexPlugins,
        defaultIndexFieldPlugin,
        fieldTypePlugins
    } = setupEntriesIndexHelpers({ context });

    function getFieldIndexPlugin(fieldType: string) {
        return fieldIndexPlugins[fieldType] || defaultIndexFieldPlugin;
    }

    function getFieldTypePlugin(fieldType: string) {
        return fieldTypePlugins[fieldType];
    }

    const list: CmsContentEntry[] = [];

    for (const entry of entries) {
        // This object will contain values processed by field index plugins
        const indexValues = {};

        // We only consider fields that are present in the model
        for (const field of model.fields) {
            const fieldTypePlugin = fieldTypePlugins[field.type];
            if (!fieldTypePlugin) {
                throw new Error(`Missing field type plugin "${field.type}".`);
            }

            const targetFieldPlugin = getFieldIndexPlugin(field.type);
            if (targetFieldPlugin && targetFieldPlugin.fromIndex) {
                try {
                    indexValues[field.fieldId] = targetFieldPlugin.fromIndex({
                        context,
                        model,
                        field,
                        getFieldIndexPlugin,
                        getFieldTypePlugin,
                        value: entry.values[field.fieldId],
                        rawValue: entry.rawValues[field.fieldId]
                    });
                } catch (ex) {
                    throw new Error(
                        ex.message || "Could not transform entry field from index.",
                        ex.code || "FIELD_FROM_INDEX_ERROR",
                        {
                            field,
                            entry
                        }
                    );
                }
            }
        }
        list.push({ ...entry, values: indexValues });
    }

    return list;
};

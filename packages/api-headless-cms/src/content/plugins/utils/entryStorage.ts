import Error from "@webiny/error";
import {
    CmsContentEntry,
    CmsContentModel,
    CmsContentModelField,
    CmsContext,
    CmsModelFieldToStoragePlugin
} from "~/types";

interface GetStoragePluginFactory {
    (context: CmsContext): (fieldType: string) => CmsModelFieldToStoragePlugin<any>;
}

export const getStoragePluginFactory: GetStoragePluginFactory = context => {
    let defaultStoragePlugin: CmsModelFieldToStoragePlugin;
    const storagePlugins = {};

    context.plugins
        .byType<CmsModelFieldToStoragePlugin>("cms-model-field-to-storage")
        // we reverse plugins because we want to get latest added only
        .reverse()
        .forEach(plugin => {
            // check if it's a default plugin
            if (plugin.fieldType === "*" && !defaultStoragePlugin) {
                defaultStoragePlugin = plugin;
                return;
            }

            // either existing plugin added or plugin fieldType does not exist in current model
            // this is to iterate a bit less later
            if (!storagePlugins[plugin.fieldType]) {
                storagePlugins[plugin.fieldType] = plugin;
            }
        });

    return fieldType => storagePlugins[fieldType] || defaultStoragePlugin;
};

/**
 * This should be used when transforming the whole entry.
 */
const entryStorageTransform = async (
    context: CmsContext,
    model: CmsContentModel,
    operation: "toStorage" | "fromStorage",
    entry: CmsContentEntry
): Promise<CmsContentEntry> => {
    const getStoragePlugin = getStoragePluginFactory(context);

    const transformedValues: Record<string, any> = {};
    for (const field of model.fields) {
        const plugin = getStoragePlugin(field.type);
        // TODO: remove this once plugins are converted into classes
        if (typeof plugin[operation] !== "function") {
            throw new Error(
                `Missing "${operation}" function in storage plugin "${plugin.name}" for field type "${field.type}"`
            );
        }

        transformedValues[field.fieldId] = await plugin[operation]({
            context,
            model,
            field,
            value: entry.values[field.fieldId],
            getStoragePlugin
        });
    }

    return { ...entry, values: transformedValues };
};

/**
 * A function that is used in crud to transform entry into the storage type.
 */
export const entryToStorageTransform = async (
    context: CmsContext,
    model: CmsContentModel,
    entry: CmsContentEntry
): Promise<CmsContentEntry> => {
    return entryStorageTransform(context, model, "toStorage", entry);
};

/**
 * A function that is used to transform the whole entry from storage into its native form.
 */
export const entryFromStorageTransform = async (
    context: CmsContext,
    model: CmsContentModel,
    entry?: CmsContentEntry & Record<string, any>
): Promise<CmsContentEntry> => {
    if (!entry) {
        return null;
    }
    return entryStorageTransform(context, model, "fromStorage", entry);
};

interface EntryFieldFromStorageTransformParams {
    context: CmsContext;
    model: CmsContentModel;
    field: CmsContentModelField;
    value: any;
}

/*
 * A function that is used to transform a single field from storage
 */
export const entryFieldFromStorageTransform = async (
    params: EntryFieldFromStorageTransformParams
): Promise<any> => {
    const { context, model, field, value } = params;
    const getStoragePlugin = getStoragePluginFactory(context);

    const plugin = getStoragePlugin(field.type);

    // TODO: remove this once plugins are converted into classes
    if (typeof plugin.fromStorage !== "function") {
        throw new Error(
            `Missing "fromStorage" function in storage plugin "${plugin.name}" for field type "${field.type}"`
        );
    }

    return plugin.fromStorage({
        context,
        model,
        field,
        value,
        getStoragePlugin
    });
};

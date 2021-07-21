import {
    CmsContentEntry,
    CmsContentEntryListWhere,
    CmsContentModel,
    CmsContentModelField,
    CmsContext,
    CmsModelFieldToStoragePlugin
} from "@webiny/api-headless-cms/types";
import { Plugin } from "@webiny/plugins/types";
import WebinyError from "@webiny/error";
import lodashSortBy from "lodash.sortby";
import dotProp from "dot-prop";
import { CmsFieldFilterPathPlugin, CmsFieldFilterValueTransformPlugin } from "~/types";
import { systemFields } from "./systemFields";
import { ValueFilterPlugin } from "@webiny/db-dynamodb/plugins/definitions/ValueFilterPlugin";
import { getStoragePluginFactory } from "@webiny/api-headless-cms/content/plugins/utils/entryStorage";

interface ModelField {
    def: CmsContentModelField;
    valueTransformer: (value: any) => any;
    valuePath: string;
    isSystemField?: boolean;
}

type ModelFieldRecords = Record<string, ModelField>;

interface CreateFiltersArgs {
    context: CmsContext;
    where: CmsContentEntryListWhere;
    fields: ModelFieldRecords;
}

interface ItemFilter {
    field: CmsContentModelField;
    fieldId: string;
    path: string;
    filterPlugin: ValueFilterPlugin;
    negate: boolean;
    compareValue: any;
    transformValue: <I = any, O = any>(value: I) => O;
    storageTransformPlugin?: CmsModelFieldToStoragePlugin;
}

interface FilterItemsArgs {
    items: CmsContentEntry[];
    where: CmsContentEntryListWhere;
    context: CmsContext;
    model: CmsContentModel;
    fields: ModelFieldRecords;
}

const VALUES_ATTRIBUTE = "values";

const extractWhereArgs = (key: string) => {
    const result = key.split("_");
    const fieldId = result.shift();
    const rawOp = result.length === 0 ? "eq" : result.join("_");
    /**
     * When rawOp is not, it means it is equal negated so just return that.
     */
    if (rawOp === "not") {
        return {
            fieldId,
            operation: "eq",
            negate: true
        };
    }
    const negate = rawOp.match("not_") !== null;
    const operation = rawOp.replace("not_", "");
    return { fieldId, operation, negate };
};

const transformValue = (value: any, transform: (value: any) => any): any => {
    if (Array.isArray(value)) {
        return value.map(v => transform(v));
    }
    return transform(value);
};

const createFilters = (args: CreateFiltersArgs): ItemFilter[] => {
    const { where, context, fields } = args;
    const filterPlugins = getMappedPlugins<ValueFilterPlugin>({
        context,
        type: ValueFilterPlugin.type,
        property: "operation"
    });
    const transformValuePlugins = getMappedPlugins<CmsFieldFilterValueTransformPlugin>({
        context,
        type: "cms-field-filter-value-transform",
        property: "fieldType"
    });
    const valuePathPlugins = getMappedPlugins<CmsFieldFilterPathPlugin>({
        context,
        type: "cms-field-filter-path",
        property: "fieldType"
    });
    /**
     * Sometimes we will need to transform the value with the storage transformer plugin.
     */
    const fieldStoragePlugins = getMappedPlugins<CmsModelFieldToStoragePlugin>({
        context,
        type: "cms-model-field-to-storage",
        property: "fieldType"
    });
    return Object.keys(where).map(key => {
        const { fieldId, operation, negate } = extractWhereArgs(key);

        const field: ModelField = fields[fieldId];
        if (!field) {
            throw new WebinyError(
                `There is no field with the fieldId "${fieldId}".`,
                "FIELD_ERROR",
                {
                    fieldId
                }
            );
        }

        const transformValuePlugin: CmsFieldFilterValueTransformPlugin =
            transformValuePlugins[field.def.type];
        const valuePathPlugin = valuePathPlugins[field.def.type];
        let targetValuePath: string;
        /**
         * A plugin that will transform the value from the storage, if required.
         */
        const storageTransformPlugin = fieldStoragePlugins[field.def.type];
        /**
         * add the base path if field is not a system field
         * pathPlugin should not know about that
         */
        const basePath = systemFields[fieldId] ? "" : `${VALUES_ATTRIBUTE}.`;
        if (valuePathPlugin) {
            targetValuePath = valuePathPlugin.createPath({
                field: field.def
            });
        } else if (systemFields[fieldId]) {
            targetValuePath = fieldId;
        } else {
            targetValuePath = field.def.fieldId;
        }

        const valuePath = `${basePath}${targetValuePath}`;

        const filterPlugin = filterPlugins[operation];
        if (!filterPlugin) {
            throw new WebinyError(
                `There is no filter plugin for operation "${operation}".`,
                "FILTER_PLUGIN_ERROR",
                {
                    operation
                }
            );
        }

        const transformValueCallable = (value: any) => {
            if (!transformValuePlugin) {
                return value;
            }
            return transformValuePlugin.transform({
                field: field.def,
                value
            });
        };

        return {
            field: field.def,
            fieldId,
            path: valuePath,
            filterPlugin,
            negate,
            compareValue: transformValue(where[key], transformValueCallable),
            transformValue: transformValueCallable,
            storageTransformPlugin: storageTransformPlugin
        };
    });
};

export const filterItems = async (args: FilterItemsArgs): Promise<CmsContentEntry[]> => {
    const { items, where, model, context, fields } = args;

    const getStoragePlugin = getStoragePluginFactory(context);

    const filters = createFilters({
        context,
        where,
        fields
    });

    const filteredItems: CmsContentEntry[] = [];
    for (const item of items) {
        let passing = true;
        filterLoop: for (const filter of filters) {
            let value = transformValue(dotProp.get(item, filter.path), filter.transformValue);
            /**
             * If there is a storage transform plugin for the given field, we need to apply it.
             */
            if (filter.storageTransformPlugin) {
                try {
                    value = await filter.storageTransformPlugin.fromStorage({
                        context,
                        model,
                        field: filter.field,
                        value,
                        getStoragePlugin
                    });
                } catch (ex) {
                    throw new WebinyError(
                        ex.message || "Could not transform field value from storage.",
                        ex.code || "FIELD_VALUE_FROM_STORAGE_ERROR",
                        {
                            field: filter.field
                        }
                    );
                }
            }
            const matched = filter.filterPlugin.matches({
                value,
                compareValue: filter.compareValue
            });
            if ((filter.negate ? !matched : matched) === false) {
                passing = false;
                break filterLoop;
            }
        }
        if (!passing) {
            continue;
        }
        filteredItems.push(item);
    }
    return filteredItems;
};

const extractSort = (
    sortBy: string,
    fields: ModelFieldRecords
): { valuePath: string; reverse: boolean; fieldId: string } => {
    const result = sortBy.split("_");
    if (result.length !== 2) {
        throw new WebinyError(
            "Problem in determining the sorting for the entry items.",
            "SORT_ERROR",
            {
                sortBy
            }
        );
    }
    const [fieldId, order] = result;

    const modelField = fields[fieldId];

    if (!modelField) {
        throw new WebinyError(
            "Sorting field does not exist in the content model.",
            "SORTING_FIELD_ERROR",
            {
                fieldId,
                fields
            }
        );
    }
    const valuePath = modelField.valuePath;
    return {
        fieldId,
        valuePath,
        reverse: order === "DESC"
    };
};

interface SortEntryItemsArgs {
    items: CmsContentEntry[];
    sort: string[];
    fields: ModelFieldRecords;
}

export const sortEntryItems = (args: SortEntryItemsArgs): CmsContentEntry[] => {
    const { items, sort = [], fields } = args;
    if (items.length <= 1) {
        return items;
    } else if (sort.length === 0) {
        sort.push("savedOn_DESC");
    } else if (sort.length > 1) {
        throw new WebinyError("Sorting is limited to a single field", "SORT_ERROR", {
            sort: sort
        });
    }
    const [firstSort] = sort;
    if (!firstSort) {
        throw new WebinyError("Empty sort array item.", "SORT_ERROR", {
            sort
        });
    }

    const { fieldId, valuePath, reverse } = extractSort(firstSort, fields);
    const field = fields[fieldId];

    const itemsToSort = items.map(item => {
        return {
            id: item.id,
            value: field.valueTransformer(dotProp.get(item, valuePath))
        };
    });
    const sortedItems: { id: string; value: any }[] = lodashSortBy(itemsToSort, "value");
    const newItems = sortedItems.map(s => {
        const item = items.find(i => i.id === s.id);
        if (item) {
            return item;
        }
        throw new WebinyError(
            "Could not find item by given id after the sorting.",
            "SORTING_ITEMS_ERROR",
            {
                id: s.id,
                sortingBy: fieldId,
                reverse
            }
        );
    });
    if (!reverse) {
        return newItems;
    }
    return newItems.reverse();
};

const getMappedPlugins = <T extends Plugin>(args: {
    context: CmsContext;
    type: string;
    property: string;
}): Record<string, T> => {
    const { context, type, property } = args;
    const plugins = context.plugins.byType<T>(type);
    if (plugins.length === 0) {
        throw new WebinyError(`There are no plugins of type "${type}".`, "PLUGINS_ERROR", {
            type
        });
    }
    return plugins.reduce((collection, plugin) => {
        const key = plugin[property];
        if (typeof key !== "string") {
            throw new WebinyError(
                "Property to map the plugins on must be a string.",
                "PLUGIN_PROPERTY_ERROR",
                {
                    type,
                    property
                }
            );
        }
        collection[key] = plugin;
        return collection;
    }, {});
};

export const buildModelFields = ({
    context,
    model
}: {
    context: CmsContext;
    model: CmsContentModel;
}) => {
    const transformValuePlugins = getMappedPlugins<CmsFieldFilterValueTransformPlugin>({
        context,
        type: "cms-field-filter-value-transform",
        property: "fieldType"
    });
    const valuePathPlugins = getMappedPlugins<CmsFieldFilterPathPlugin>({
        context,
        type: "cms-field-filter-path",
        property: "fieldType"
    });
    const fields: ModelFieldRecords = Object.values(systemFields).reduce((collection, field) => {
        const transformValuePlugin = transformValuePlugins[field.type];
        const valuePathPlugin = valuePathPlugins[field.type];
        let valuePath: string;
        if (valuePathPlugin) {
            valuePath = valuePathPlugin.createPath({
                field
            });
        }
        collection[field.fieldId] = {
            def: field,
            valueTransformer: (value: any) => {
                if (!transformValuePlugin) {
                    return value;
                }
                return transformValuePlugin.transform({ field, value });
            },
            valuePath: valuePath || field.fieldId,
            isSystemField: true
        };

        return collection;
    }, {} as ModelFieldRecords);

    return model.fields.reduce((collection, field) => {
        const transformValuePlugin = transformValuePlugins[field.type];
        const valuePathPlugin = valuePathPlugins[field.type];
        let valuePath: string;
        if (valuePathPlugin) {
            valuePath = valuePathPlugin.createPath({
                field
            });
        }
        const targetValuePath = `${VALUES_ATTRIBUTE}.${valuePath || field.fieldId}`;
        collection[field.fieldId] = {
            def: field,
            valueTransformer: (value: any) => {
                if (!transformValuePlugin) {
                    return value;
                }
                return transformValuePlugin.transform({ field, value });
            },
            valuePath: targetValuePath || field.fieldId
        };

        return collection;
    }, fields);
};

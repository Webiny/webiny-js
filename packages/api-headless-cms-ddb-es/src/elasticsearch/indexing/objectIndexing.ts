import { CmsModelFieldToElasticsearchPlugin } from "~/types";
import {
    CmsContentModel,
    CmsContentModelField,
    CmsContext,
    CmsModelFieldToGraphQLPlugin
} from "@webiny/api-headless-cms/types";

interface ProcessToIndex {
    (params: {
        fields: CmsContentModelField[];
        rawValue: Record<string, any>;
        storageValue: Record<string, any>;
        getFieldIndexPlugin: (fieldType: string) => CmsModelFieldToElasticsearchPlugin;
        getFieldTypePlugin: (fieldType: string) => CmsModelFieldToGraphQLPlugin;
        context: CmsContext;
        model: CmsContentModel;
    }): Record<"value" | "rawValue", Record<string, any>>;
}

interface ProcessFromIndex {
    (params: {
        fields: CmsContentModelField[];
        value: Record<string, any>;
        rawValue: Record<string, any>;
        getFieldIndexPlugin: (fieldType: string) => CmsModelFieldToElasticsearchPlugin;
        getFieldTypePlugin: (fieldType: string) => CmsModelFieldToGraphQLPlugin;
        context: CmsContext;
        model: CmsContentModel;
    }): Record<string, any>;
}

const processToIndex: ProcessToIndex = ({
    fields,
    rawValue: sourceRawValue,
    storageValue: sourceStorageValue,
    getFieldIndexPlugin,
    getFieldTypePlugin,
    context,
    model
}) => {
    const reducer = (values, field) => {
        const plugin = getFieldIndexPlugin(field.type);
        const { value, rawValue } = plugin.toIndex({
            context,
            model,
            field,
            rawValue: sourceRawValue[field.fieldId],
            storageValue: sourceStorageValue[field.fieldId],
            getFieldIndexPlugin,
            getFieldTypePlugin
        });

        if (value !== undefined) {
            values.value[field.fieldId] = value;
        }

        if (rawValue !== undefined) {
            values.rawValue[field.fieldId] = rawValue;
        }

        return values;
    };

    return fields.reduce(reducer, { value: {}, rawValue: {} });
};
const processFromIndex: ProcessFromIndex = ({
    fields,
    value: sourceValue,
    rawValue: sourceRawValue,
    getFieldIndexPlugin,
    getFieldTypePlugin,
    context,
    model
}) => {
    const reducer = (values, field) => {
        const plugin = getFieldIndexPlugin(field.type);
        const value = plugin.fromIndex({
            context,
            model,
            field,
            value: sourceValue[field.fieldId],
            rawValue: sourceRawValue[field.fieldId],
            getFieldIndexPlugin,
            getFieldTypePlugin
        });

        if (value !== undefined) {
            values[field.fieldId] = value;
        }

        return values;
    };

    return fields.reduce(reducer, {});
};

export default (): CmsModelFieldToElasticsearchPlugin => ({
    type: "cms-model-field-to-elastic-search",
    name: "cms-model-field-to-elastic-search-object",
    fieldType: "object",
    toIndex({
        context,
        model,
        field,
        rawValue: sourceRawValue,
        storageValue: sourceStorageValue,
        getFieldIndexPlugin,
        getFieldTypePlugin
    }) {
        if (!sourceStorageValue) {
            return { value: null };
        }

        const fields = field.settings.fields as CmsContentModelField[];

        /**
         * In "object" field, value is either an object or an array of objects.
         */
        if (field.multipleValues) {
            const values = sourceStorageValue.reduce(
                (acc, item, index) => {
                    const { value, rawValue } = processToIndex({
                        rawValue: sourceRawValue[index],
                        storageValue: item,
                        getFieldIndexPlugin,
                        getFieldTypePlugin,
                        model,
                        context,
                        fields
                    });

                    if (Object.keys(value).length > 0) {
                        acc.value.push(value);
                    }

                    if (Object.keys(rawValue).length > 0) {
                        acc.rawValue.push(rawValue);
                    }
                    return acc;
                },
                { value: [], rawValue: [] }
            );

            return {
                value: values.value.length > 0 ? values.value : undefined,
                rawValue: values.rawValue.length > 0 ? values.rawValue : undefined
            };
        }

        return processToIndex({
            rawValue: sourceRawValue,
            storageValue: sourceStorageValue,
            getFieldIndexPlugin,
            getFieldTypePlugin,
            model,
            context,
            fields
        });
    },
    fromIndex({ field, value, rawValue, model, context, getFieldIndexPlugin, getFieldTypePlugin }) {
        if (!value) {
            return null;
        }

        const fields = field.settings.fields as CmsContentModelField[];

        /**
         * In "object" field, value is either an object or an array of objects.
         */
        if (field.multipleValues) {
            /**
             * Why this `value || rawValue || []`?
             * It's possible that an object contains all non-indexable fields, or vice-versa, and so
             * we can never be sure which array we can reliably use as a source of values.
             */
            const source = value || rawValue || [];

            return source.map((_, index) =>
                processFromIndex({
                    value: value ? value[index] || {} : {},
                    rawValue: rawValue ? rawValue[index] || {} : {},
                    getFieldIndexPlugin,
                    getFieldTypePlugin,
                    model,
                    context,
                    fields
                })
            );
        }

        return processFromIndex({
            value,
            rawValue,
            getFieldIndexPlugin,
            getFieldTypePlugin,
            model,
            context,
            fields
        });
    }
});

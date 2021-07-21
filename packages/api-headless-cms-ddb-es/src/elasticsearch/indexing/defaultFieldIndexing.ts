import { CmsModelFieldToElasticsearchPlugin } from "~/types";

export default (): CmsModelFieldToElasticsearchPlugin => ({
    type: "cms-model-field-to-elastic-search",
    name: "cms-model-field-to-elastic-search-default",
    fieldType: "*",
    toIndex({ field, getFieldTypePlugin, storageValue }) {
        const fieldTypePlugin = getFieldTypePlugin(field.type);

        // when field is searchable, assign it to `values`
        if (fieldTypePlugin.isSearchable === true) {
            return { value: storageValue };
        }

        // when field is not searchable, move its value to `rawValues`.
        // `rawValues` is a field in ES index that's not being indexed.
        return { rawValue: storageValue };
    },
    fromIndex({ field, getFieldTypePlugin, value, rawValue }) {
        const { isSearchable } = getFieldTypePlugin(field.type);

        return isSearchable === true ? value : rawValue;
    }
});

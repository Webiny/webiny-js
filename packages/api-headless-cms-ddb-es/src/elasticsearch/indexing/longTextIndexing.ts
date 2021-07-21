import { CmsModelFieldToElasticsearchPlugin } from "~/types";

export default (): CmsModelFieldToElasticsearchPlugin => ({
    type: "cms-model-field-to-elastic-search",
    name: "cms-model-field-to-elastic-search-long-text",
    fieldType: "long-text",
    toIndex(args) {
        const { storageValue, rawValue } = args;
        return {
            value: rawValue,
            rawValue: storageValue
        };
    },
    fromIndex(args) {
        const { value, rawValue } = args;
        /**
         * To handle backward compatibility;
         * there might be some entries where the indexed entry doesn't have any "rawValues"
         */
        return rawValue || value;
    }
});

import {
    CmsContentModelDateTimeField,
    ElasticsearchQueryBuilderValueSearchPlugin
} from "@webiny/api-headless-cms/types";

export default (): ElasticsearchQueryBuilderValueSearchPlugin => ({
    type: "elastic-search-query-builder-value-search",
    name: "elastic-search-query-builder-value-search-time",
    fieldType: "datetime",
    transform: (field: CmsContentModelDateTimeField, value) => {
        if (field.settings.type !== "time") {
            return value;
        }
        const [hours, minutes, seconds = 0] = value.split(":").map(Number);
        return hours * 60 * 60 + minutes * 60 + seconds;
    }
});

import { ElasticsearchQueryBuilderPlugin } from "../../types";

export const elasticsearchOperatorInPlugin = (): ElasticsearchQueryBuilderPlugin => ({
    type: "cms-elastic-search-query-builder",
    name: "elastic-search-query-builder-in",
    operator: "in",
    apply(query, { field, value: values }) {
        if (Array.isArray(values) === false || values.length === 0) {
            throw new Error(
                `You cannot filter field "${field}" with "in" operator and not send an array of values.`
            );
        }
        query.must.push({
            terms: {
                [`${field}.keyword`]: values
            }
        });
    }
});

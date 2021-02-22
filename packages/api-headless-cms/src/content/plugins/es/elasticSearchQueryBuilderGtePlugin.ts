import { ElasticsearchQueryBuilderPlugin } from "@webiny/api-headless-cms/types";

export const elasticSearchQueryBuilderGtePlugin = (): ElasticsearchQueryBuilderPlugin => ({
    type: "cms-elastic-search-query-builder",
    name: "elastic-search-query-builder-gte",
    operator: "gte",
    apply(query, { field, value }) {
        query.must.push({
            range: {
                [field]: {
                    gte: value
                }
            }
        });
    }
});

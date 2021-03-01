import { ElasticsearchQueryBuilderPlugin } from "../../../types";

export const elasticSearchQueryBuilderNotContainsPlugin = (): ElasticsearchQueryBuilderPlugin => ({
    type: "cms-elastic-search-query-builder",
    name: "elastic-search-query-builder-not-contains",
    operator: "not_contains",
    apply(query, { field, value }) {
        query.mustNot.push({
            query_string: {
                allow_leading_wildcard: true,
                fields: [field],
                query: `*${value}*`
            }
        });
    }
});

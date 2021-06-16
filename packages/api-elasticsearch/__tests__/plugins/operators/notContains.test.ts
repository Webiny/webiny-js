import { createBlankQuery } from "../../helpers";
import { ElasticsearchBoolQueryConfig } from "@webiny/api-plugin-elastic-search-client/types";
import { ElasticsearchQueryBuilderOperatorNotContainsPlugin } from "~/plugins/operator";

describe("ElasticsearchQueryBuilderOperatorNotContainsPlugin", () => {
    const plugin = new ElasticsearchQueryBuilderOperatorNotContainsPlugin();
    const context: any = {};

    it("should apply not contains correctly", () => {
        const query = createBlankQuery();

        plugin.apply(query, {
            path: "name",
            value: "John",
            context
        });
        const expected: ElasticsearchBoolQueryConfig = {
            must_not: [
                {
                    query_string: {
                        allow_leading_wildcard: true,
                        fields: ["name"],
                        query: "*John*"
                    }
                }
            ],
            must: [],
            filter: [],
            should: []
        };
        expect(query).toEqual(expected);
    });
});

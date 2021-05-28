import { elasticsearchOperatorNotContainsPlugin } from "../../../../src/elasticsearch/operators/notContains";
import { createBlankQuery } from "../helpers";
import { ElasticsearchQuery } from "@webiny/api-plugin-elastic-search-client/types";

describe("elasticsearchOperatorNotContainsPlugin", () => {
    const plugin = elasticsearchOperatorNotContainsPlugin();
    const context: any = {};

    it("should apply not contains correctly", () => {
        const query = createBlankQuery();

        plugin.apply(query, {
            field: "name",
            value: "John",
            context
        });
        const expected: ElasticsearchQuery = {
            mustNot: [
                {
                    query_string: {
                        allow_leading_wildcard: true,
                        fields: ["name"],
                        query: "*John*"
                    }
                }
            ],
            must: [],

            should: []
        };
        expect(query).toEqual(expected);
    });
});

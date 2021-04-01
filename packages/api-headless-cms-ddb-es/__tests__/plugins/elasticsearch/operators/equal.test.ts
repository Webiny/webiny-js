import { elasticsearchOperatorEqualPlugin } from "../../../../src/elasticsearch/operators/equal";
import { createBlankQuery } from "../helpers";
import { ElasticsearchQuery } from "../../../../src/types";

describe("elasticsearchOperatorEqualPlugin", () => {
    const plugin = elasticsearchOperatorEqualPlugin();
    const context: any = {};

    it("should apply must correctly", () => {
        const query = createBlankQuery();

        plugin.apply(query, {
            field: "name",
            value: "John",
            context
        });

        plugin.apply(query, {
            field: "name",
            value: "Doe",
            context
        });

        const expected: ElasticsearchQuery = {
            mustNot: [],
            must: [
                {
                    term: {
                        "name.keyword": "John"
                    }
                },
                {
                    term: {
                        "name.keyword": "Doe"
                    }
                }
            ],
            match: [],
            should: []
        };

        expect(query).toEqual(expected);
    });
});

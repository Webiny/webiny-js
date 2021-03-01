import { elasticSearchQueryBuilderGtePlugin } from "../../../src/content/plugins/es/elasticSearchQueryBuilderGtePlugin";
import { createBlankQuery } from "./helpers";
import { ElasticsearchQuery } from "../../../src/types";

describe("elasticSearchQueryBuilderGtePlugin", () => {
    const plugin = elasticSearchQueryBuilderGtePlugin();
    const context: any = {};

    it("should apply gte correctly", () => {
        const query = createBlankQuery();
        plugin.apply(query, {
            value: 100,
            field: "id",
            context
        });

        const expected: ElasticsearchQuery = {
            mustNot: [],
            must: [
                {
                    range: {
                        id: {
                            gte: 100
                        }
                    }
                }
            ],
            match: [],
            should: []
        };

        expect(query).toEqual(expected);
    });

    it("should apply multiple gte correctly", () => {
        const query = createBlankQuery();
        plugin.apply(query, {
            value: 100,
            field: "id",
            context
        });

        const from = new Date();
        plugin.apply(query, {
            value: from,
            field: "date",
            context
        });

        const expected: ElasticsearchQuery = {
            mustNot: [],
            must: [
                {
                    range: {
                        id: {
                            gte: 100
                        }
                    }
                },
                {
                    range: {
                        date: {
                            gte: from
                        }
                    }
                }
            ],
            match: [],
            should: []
        };
        expect(query).toEqual(expected);
    });
});

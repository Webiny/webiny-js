import { elasticSearchQueryBuilderGtPlugin } from "../../../src/content/plugins/es/elasticSearchQueryBuilderGtPlugin";
import { createBlankQuery } from "./helpers";
import { ElasticsearchQuery } from "../../../src/types";

describe("elasticSearchQueryBuilderGtPlugin", () => {
    const plugin = elasticSearchQueryBuilderGtPlugin();
    const context: any = {};

    it("should apply gt correctly", () => {
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
                            gt: 100
                        }
                    }
                }
            ],
            match: [],
            should: []
        };

        expect(query).toEqual(expected);
    });

    it("should apply multiple gt correctly", () => {
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
                            gt: 100
                        }
                    }
                },
                {
                    range: {
                        date: {
                            gt: from
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

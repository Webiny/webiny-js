// @ts-ignore
import { PluginsContainer } from "../../../../plugins";
import filterPlugins from "../../../src/filters";
import { CmsFieldValueFilterPlugin } from "../../../src/types";

describe("filters", () => {
    let plugins: PluginsContainer;

    beforeEach(() => {
        plugins = new PluginsContainer();
        plugins.register(filterPlugins());
    });

    const operations = [
        ["eq"],
        ["not_eq"],
        ["in"],
        ["not_in"],
        ["gt"],
        ["not_gt"],
        ["gte"],
        ["not_gte"],
        ["lt"],
        ["not_lt"],
        ["lte"],
        ["not_lte"],
        ["contains"],
        ["not_contains"],
        ["between"],
        ["not_between"]
    ];

    const findFilterPlugin = (operation: string): CmsFieldValueFilterPlugin<any> => {
        const byType = plugins.byType<CmsFieldValueFilterPlugin<any>>("cms-field-value-filter");

        return byType.find(plugin => plugin.operation === operation);
    };

    test.each(operations)("has the filter plugin registered - %s", (operation: string) => {
        const exists = findFilterPlugin(operation) !== undefined;

        expect(exists).toBe(true);
    });

    const equalList = [
        [1, 1],
        [932, 932],
        ["some text", "some text"],
        [true, true],
        [false, false]
    ];
    test.each(equalList)("values should be equal", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("eq");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const notEqualList = [
        [1, 2],
        [932, 132],
        ["some text", "some text 2"],
        [true, false],
        [false, true]
    ];
    test.each(notEqualList)("values should not be equal", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("not_eq");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const inList = [
        [1, [1, 2, 3]],
        [932, [932, "text", new Date()]],
        ["some text", ["some text", 2, true]],
        [true, [true, false, "2", 1]],
        [false, [false, "4", new Date()]]
    ];
    test.each(inList)("values should be in", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("in");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const notInList = [
        [1, [5, 2, 3]],
        [932, ["932", "text", new Date()]],
        ["some text", ["some text 2", 2, true]],
        [true, ["true", false, "2", 1]],
        [false, ["false", "4", new Date()]]
    ];
    test.each(notInList)("values should not be in", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("not_in");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const gtList = [
        [2, 1],
        [933, 932],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:22.999Z")],
        [new Date("2021-01-02T23:23:24.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:24:23.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-03T00:23:23.000Z"), new Date("2021-01-02T23:23:23.000Z")]
    ];
    test.each(gtList)("value should be greater", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("gt");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const notGtList = [
        [2, 3],
        [2, 2],
        [933, 934],
        [933, 933],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:23.001Z")],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:23:24.000Z"), new Date("2021-01-02T23:24:24.000Z")],
        [new Date("2021-01-02T23:24:23.000Z"), new Date("2021-01-03T00:24:23.000Z")],
        [new Date("2021-01-03T00:23:23.000Z"), new Date("2021-01-04T00:23:23.000Z")]
    ];
    test.each(notGtList)("value should not be greater", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("not_gt");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const gteList = [
        [2, 1],
        [2, 2],
        [933, 932],
        [933, 933],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:22.999Z")],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:23:24.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:23:24.000Z"), new Date("2021-01-02T23:23:24.000Z")],
        [new Date("2021-01-02T23:24:23.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:24:23.000Z"), new Date("2021-01-02T23:24:23.000Z")],
        [new Date("2021-01-03T00:23:23.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-03T23:23:23.000Z"), new Date("2021-01-03T23:23:23.000Z")]
    ];
    test.each(gteList)("value should be greater or equal", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("gte");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const notGteList = [
        [2, 3],
        [933, 934],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:23.001Z")],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:24.000Z")],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:24:23.000Z")],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-03T00:23:23.000Z")]
    ];
    test.each(notGteList)(
        "value should not be greater or equal",
        (inputValue: any, compareValue: any) => {
            const plugin = findFilterPlugin("not_gte");

            const result = plugin.matches({
                inputValue,
                compareValue
            });

            expect(result).toBe(true);
        }
    );

    const ltList = [
        [2, 3],
        [933, 934],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:23.001Z")],
        [new Date("2021-01-02T23:23:24.000Z"), new Date("2021-01-02T23:23:25.000Z")],
        [new Date("2021-01-02T23:24:23.000Z"), new Date("2021-01-03T00:25:23.000Z")],
        [new Date("2021-01-03T00:23:23.000Z"), new Date("2021-01-04T00:23:24.000Z")]
    ];
    test.each(ltList)("value should be lesser", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("lt");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const notLtList = [
        [4, 3],
        [3, 2],
        [935, 934],
        [933, 933],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:23:23.001Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:23:24.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:24:23.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-03T00:23:23.000Z"), new Date("2021-01-02T23:23:23.000Z")]
    ];
    test.each(notLtList)("value should not be lesser", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("not_lt");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const lteList = [
        [2, 3],
        [2, 2],
        [933, 934],
        [933, 933],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:23.001Z")],
        [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:23:24.000Z"), new Date("2021-01-02T23:23:25.000Z")],
        [new Date("2021-01-02T23:23:24.000Z"), new Date("2021-01-02T23:23:24.000Z")],
        [new Date("2021-01-02T23:24:23.000Z"), new Date("2021-01-03T00:25:23.000Z")],
        [new Date("2021-01-02T23:24:23.000Z"), new Date("2021-01-02T23:24:23.000Z")],
        [new Date("2021-01-03T00:23:23.000Z"), new Date("2021-01-04T00:23:24.000Z")],
        [new Date("2021-01-03T00:23:23.000Z"), new Date("2021-01-03T00:23:23.000Z")]
    ];
    test.each(lteList)("value should be lesser or equal", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("lte");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const notLteList = [
        [4, 3],
        [935, 934],
        [new Date("2021-01-02T23:23:23.001Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:23:24.000Z"), new Date("2021-01-02T23:23:23.000Z")],
        [new Date("2021-01-02T23:24:23.000Z"), new Date("2021-01-02T23:23:23.000Z")]
    ];
    test.each(notLteList)(
        "value should not be lesser or equal",
        (inputValue: any, compareValue: any) => {
            const plugin = findFilterPlugin("not_lte");

            const result = plugin.matches({
                inputValue,
                compareValue
            });

            expect(result).toBe(true);
        }
    );

    const containsList = [
        ["some text with description", "with"],
        ["some text with description", "text with"]
    ];
    test.each(containsList)("value should contain", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("contains");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const notContainsList = [
        ["some text with description", "with text"],
        ["some text with description", "with some"]
    ];
    test.each(notContainsList)("value should not contain", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("not_contains");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const betweenList = [
        [5, [4, 6]],
        [5, [4, 5]],
        [
            new Date("2021-01-02T23:23:23.000Z"),
            [new Date("2021-01-02T23:23:22.000Z"), new Date("2021-01-02T23:23:24.000Z")]
        ],
        [
            new Date("2021-01-02T23:23:23.000Z"),
            [new Date("2021-01-02T23:23:22.999Z"), new Date("2021-01-02T23:23:23.001Z")]
        ]
    ];
    test.each(betweenList)("values should be in between", (inputValue: any, compareValue: any) => {
        const plugin = findFilterPlugin("between");

        const result = plugin.matches({
            inputValue,
            compareValue
        });

        expect(result).toBe(true);
    });

    const notBetweenList = [
        [3, [4, 6]],
        [8, [4, 7]],
        [
            new Date("2021-01-02T23:23:22.000Z"),
            [new Date("2021-01-02T23:23:23.000Z"), new Date("2021-01-02T23:23:24.000Z")]
        ],
        [
            new Date("2021-01-02T23:23:22.998Z"),
            [new Date("2021-01-02T23:23:22.999Z"), new Date("2021-01-02T23:23:23.001Z")]
        ]
    ];
    test.each(notBetweenList)(
        "values should not be in between",
        (inputValue: any, compareValue: any) => {
            const plugin = findFilterPlugin("not_between");

            const result = plugin.matches({
                inputValue,
                compareValue
            });

            expect(result).toBe(false);
        }
    );
});

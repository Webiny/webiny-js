import numberIndexing from "~/elasticsearch/indexing/numberIndexing";

describe("numberIndexing", () => {
    const plugin = numberIndexing();

    const numbers = [
        [1, 1],
        [4382, 4382],
        [3924032, 3924032],
        [0.1235, 0.1235],
        [1.01, 1.01],
        [15.4300023, 15.4300023],
        [
            [15, 117.08],
            ["15", "117.08"]
        ],
        [
            [15.4300023, 15.4300021],
            ["15.4300023", "15.4300021"]
        ]
    ];
    test.each(numbers)("toIndex should transform %j to %j", (num: any, expected: any) => {
        const field: any = {
            fieldId: "number"
        };
        const result = plugin.toIndex({
            rawValue: num,
            storageValue: num,
            field
        } as any);

        expect(result).toEqual({
            value: expected
        });
    });
    const strings = [
        ["1", 1],
        ["4382", 4382],
        ["3924032", 3924032],
        ["0.1235", 0.1235],
        ["1.01", 1.01],
        ["15.4300023", 15.4300023],
        [15.4300023, 15.4300023],
        [
            ["15", "117.08"],
            [15, 117.08]
        ],
        [
            ["15.4300023", "15.4300021"],
            [15.4300023, 15.4300021]
        ]
    ];
    test.each(strings)("fromIndex should transform %j back to %j", (str: any, expected: any) => {
        const field: any = {
            fieldId: "number"
        };
        const result = plugin.fromIndex({ value: str, field } as any);

        expect(result).toEqual(expected);
    });
});

import numberIndexing from "../../../../src/content/plugins/es/indexing/numberIndexing";

describe("numberIndexing", () => {
    const plugin = numberIndexing();

    const numbers = [
        [1, "1"],
        [4382, "4382"],
        [3924032, "3924032"],
        [0.1235, "0.1235"],
        [1.01, "1.01"],
        [15.4300023, "15.4300023"]
    ];
    test.each(numbers)("toIndex should transform a number to a string", (num, expected) => {
        const toIndexEntry: any = {
            values: {
                number: num
            }
        };
        const field: any = {
            fieldId: "number"
        };
        const result = plugin.toIndex({ toIndexEntry, field } as any);

        expect(result.values.number).toEqual(expected);
    });
    const strings = [
        ["1", 1],
        ["4382", 4382],
        ["3924032", 3924032],
        ["0.1235", 0.1235],
        ["1.01", 1.01],
        ["15.4300023", 15.4300023]
    ];
    test.each(strings)("fromIndex should transform a string to a number", (str, expected) => {
        const entry: any = {
            values: {
                number: str
            }
        };
        const field: any = {
            fieldId: "number"
        };
        const result = plugin.fromIndex({ entry, field } as any);

        expect(result.values.number).toEqual(expected);
    });
});

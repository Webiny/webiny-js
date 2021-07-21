import longTextStoragePlugin from "../../../../src/dynamoDb/storage/longText";
import { gzip } from "@webiny/api-headless-cms/utils";

const defaultArgs = {
    field: {
        fieldId: "longTextFieldId"
    },
    model: {
        modelId: "longTextModel"
    },
    entry: {
        savedOn: new Date()
    }
};

const testValue = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

const getExpectedValue = async () => {
    const expectedCompressed = await gzip(testValue);
    return expectedCompressed.toString("base64");
};

describe("longTextStoragePlugin", () => {
    test("toStorage should transform value for storage", async () => {
        const plugin = longTextStoragePlugin();

        const result = await plugin.toStorage({
            ...defaultArgs,
            value: testValue
        } as any);

        expect(result).toEqual({
            compression: "gzip",
            value: await getExpectedValue()
        });
    });

    test("fromStorage should transform value for output", async () => {
        const expectedCompressedValue = await getExpectedValue();
        const value = {
            compression: "gzip",
            value: expectedCompressedValue
        };
        const plugin = longTextStoragePlugin();

        const result = await plugin.fromStorage({
            ...defaultArgs,
            value
        } as any);

        expect(result).toEqual(testValue);
    });

    test("toStorage should transform value for storage multipleValues", async () => {
        const expectedCompressedValue = await getExpectedValue();
        const plugin = longTextStoragePlugin();

        const result = await plugin.toStorage({
            ...defaultArgs,
            value: [testValue, testValue, testValue]
        } as any);

        expect(result).toEqual({
            compression: "gzip",
            value: [expectedCompressedValue, expectedCompressedValue, expectedCompressedValue]
        });
    });

    test("fromStorage should transform value for output multipleValues", async () => {
        const expectedCompressedValue = await getExpectedValue();
        const value = {
            compression: "gzip",
            value: [expectedCompressedValue, expectedCompressedValue]
        };
        const plugin = longTextStoragePlugin();

        const result = await plugin.fromStorage({
            ...defaultArgs,
            value
        } as any);

        expect(result).toEqual([testValue, testValue]);
    });
});

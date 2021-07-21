// @ts-ignore
import longTextIndexing from "../../../../src/elasticsearch/indexing/longTextIndexing";
import { CmsContentModelField } from "@webiny/api-headless-cms/types";

const mockValue = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
const mockContext: any = {};
const mockModel: any = {};

const mockField: CmsContentModelField = {
    id: "textField",
    type: "long-text",
    label: "Text",
    validation: [],
    listValidation: [],
    multipleValues: false,
    renderer: {
        name: "any"
    },
    fieldId: "reallyLongText",
    predefinedValues: {
        enabled: false,
        values: []
    },
    placeholderText: "text",
    helpText: "text"
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getFieldTypePlugin = (fieldType: string) => {
    return null;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getFieldIndexPlugin = (fieldType: string) => {
    return null;
};

describe("longTextIndexing", () => {
    test("toIndex should return transformed objects", () => {
        const plugin = longTextIndexing();

        const result = plugin.toIndex({
            rawValue: mockValue,
            storageValue: mockValue,
            field: mockField,
            model: mockModel,
            context: mockContext,
            getFieldTypePlugin,
            getFieldIndexPlugin
        });

        /**
         * There must be the "reallyLongText" field from the original entry because the plugin
         * takes the value from the "originalEntry" and sets it as the one in the values.
         * This is for search to actually work on the long-text field type.
         */
        expect(result).toEqual({
            rawValue: mockValue,
            value: mockValue
        });
    });

    test("fromIndex should return transformed objects", () => {
        const plugin = longTextIndexing();
        const result = plugin.fromIndex({
            value: undefined,
            rawValue: mockValue,
            field: mockField,
            model: mockModel,
            context: mockContext,
            getFieldTypePlugin,
            getFieldIndexPlugin
        });

        // we receive a bit different output than in toIndex since here we take field from rawValues and put it into values obj
        // it is being merged into new entry after that
        expect(result).toEqual(mockValue);
    });

    test("fromIndex should return transformed objects from older versions (backward compatibility)", () => {
        const plugin = longTextIndexing();
        const result = plugin.fromIndex({
            value: undefined,
            rawValue: mockValue,
            field: mockField,
            model: mockModel,
            context: mockContext,
            getFieldTypePlugin,
            getFieldIndexPlugin
        });

        // we receive a bit different output than in toIndex since here we take field from rawValues and put it into values obj
        // it is being merged into new entry after that
        expect(result).toEqual(mockValue);
    });
});

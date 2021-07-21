import richTextIndexingPlugin from "~/elasticsearch/indexing/richTextIndexing";
import { CmsContentModelField } from "@webiny/api-headless-cms/types";

const mockValue = [
    {
        tag: "p",
        content: "some long text"
    }
];
const mockContext: any = {};
const mockModel: any = {};

const mockField: CmsContentModelField = {
    id: "textField",
    type: "text",
    label: "Text",
    validation: [],
    listValidation: [],
    multipleValues: false,
    renderer: {
        name: "any"
    },
    fieldId: "text",
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

describe("richTextIndexing", () => {
    test("toIndex should return transformed objects", () => {
        const plugin = richTextIndexingPlugin();

        const result = plugin.toIndex({
            rawValue: mockValue,
            storageValue: mockValue,
            field: mockField,
            model: mockModel,
            context: mockContext,
            getFieldTypePlugin,
            getFieldIndexPlugin
        });

        // here we receive new values and rawValues objects that are populated, in rawValues case, and values being without given fieldId
        expect(result).toEqual({
            rawValue: mockValue
        });
    });

    test("fromIndex should return transformed objects", () => {
        const plugin = richTextIndexingPlugin();
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

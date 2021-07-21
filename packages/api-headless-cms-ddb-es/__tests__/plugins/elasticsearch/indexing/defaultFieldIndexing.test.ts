import defaultFieldIndexPlugin from "~/elasticsearch/indexing/defaultFieldIndexing";
import cmsFieldTypePlugins from "@webiny/api-headless-cms/content/plugins/graphqlFields";
import { CmsContentEntry } from "@webiny/api-headless-cms/types";

const mockRichTextValue = [
    {
        tag: "p",
        content: "some long text"
    }
];

const mockTextValue = "some short searchable text";

const mockContext: any = {};

const mockModel: any = {
    fields: [
        {
            fieldId: "notAffectedNumber",
            type: "number"
        },
        {
            fieldId: "notAffectedString",
            type: "text"
        },
        {
            fieldId: "richText",
            type: "rich-text"
        },
        {
            fieldId: "text",
            type: "text"
        }
    ]
};

const mockInputEntry: Partial<CmsContentEntry> = {
    values: {
        notAffectedNumber: 1,
        notAffectedString: "some text",
        richText: mockRichTextValue,
        text: mockTextValue
    }
};

const mockIndexedEntry: Partial<CmsContentEntry> & Record<string, any> = {
    values: {
        notAffectedNumber: 1,
        notAffectedString: "some text",
        text: mockTextValue
    },
    rawValues: {
        richText: mockRichTextValue
    }
};

const getFieldIndexPlugin = () => {
    return defaultFieldIndexPlugin();
};

const fieldTypePlugins = cmsFieldTypePlugins();

const getFieldTypePlugin = (fieldType: string) => {
    return fieldTypePlugins.find(pl => pl.fieldType === fieldType);
};

describe("defaultFieldIndexPlugin", () => {
    test("toIndex should return transformed objects", () => {
        const plugin = defaultFieldIndexPlugin();

        const result = mockModel.fields.reduce(
            (entry, field) => {
                const { value, rawValue } = plugin.toIndex({
                    rawValue: mockInputEntry.values[field.fieldId],
                    storageValue: mockInputEntry.values[field.fieldId],
                    getFieldIndexPlugin,
                    getFieldTypePlugin,
                    context: mockContext,
                    model: mockModel,
                    field
                });

                if (value) {
                    entry.values[field.fieldId] = value;
                }

                if (rawValue) {
                    entry.rawValues[field.fieldId] = rawValue;
                }

                return entry;
            },
            { values: {}, rawValues: {} }
        );

        expect(result).toEqual(mockIndexedEntry);
    });

    test("fromIndex should return transformed objects", () => {
        const plugin = defaultFieldIndexPlugin();
        const result = mockModel.fields.reduce((entry, field) => {
            const value = plugin.fromIndex({
                value: mockIndexedEntry.values[field.fieldId],
                rawValue: mockIndexedEntry.rawValues[field.fieldId],
                getFieldIndexPlugin,
                getFieldTypePlugin,
                context: mockContext,
                model: mockModel,
                field
            });

            if (value) {
                entry[field.fieldId] = value;
            }

            return entry;
        }, {});

        expect(result).toEqual({
            notAffectedNumber: 1,
            notAffectedString: "some text",
            text: "some short searchable text",
            richText: mockRichTextValue
        });
    });
});

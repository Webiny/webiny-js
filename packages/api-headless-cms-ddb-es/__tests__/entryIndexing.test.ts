import { PluginsContainer } from "@webiny/plugins";
import indexingPlugins from "~/elasticsearch/indexing";
import cmsFieldTypePlugins from "@webiny/api-headless-cms/content/plugins/graphqlFields";
import { CmsContentEntry } from "@webiny/api-headless-cms/types";
import { extractEntriesFromIndex, prepareEntryToIndex } from "~/helpers";

const mockRichTextValue = [
    {
        tag: "p",
        content: "some long text"
    }
];

const mockTextValue = "some short searchable text";

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
        },
        {
            fieldId: "page",
            type: "object",
            settings: {
                fields: [
                    {
                        fieldId: "title",
                        type: "text"
                    },
                    {
                        fieldId: "number",
                        type: "number"
                    },
                    {
                        fieldId: "richText",
                        type: "rich-text"
                    },
                    {
                        fieldId: "settings",
                        type: "object",
                        settings: {
                            fields: [
                                {
                                    fieldId: "title",
                                    type: "text"
                                },
                                {
                                    fieldId: "snippet",
                                    type: "rich-text"
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ]
};

const mockInputEntry: Partial<CmsContentEntry> = {
    values: {
        notAffectedNumber: 1,
        notAffectedString: "some text",
        richText: mockRichTextValue,
        text: mockTextValue,
        page: {
            title: "Title",
            number: 155.75,
            richText: [
                {
                    tag: "p",
                    content: "full"
                }
            ],
            settings: {
                title: "Settings Title",
                snippet: [
                    {
                        tag: "p",
                        content: "snippet"
                    }
                ]
            }
        }
    }
};

const mockIndexedEntry: Partial<CmsContentEntry> & Record<string, any> = {
    values: {
        notAffectedNumber: 1,
        notAffectedString: "some text",
        text: mockTextValue,
        page: {
            title: "Title",
            number: 155.75,
            settings: {
                title: "Settings Title"
            }
        }
    },
    rawValues: {
        richText: mockRichTextValue,
        page: {
            richText: [
                {
                    tag: "p",
                    content: "full"
                }
            ],
            settings: {
                snippet: [
                    {
                        tag: "p",
                        content: "snippet"
                    }
                ]
            }
        }
    }
};

const plugins = new PluginsContainer([...indexingPlugins(), ...cmsFieldTypePlugins()]);

describe("entryIndexing", () => {
    test("should prepare entry for indexing", () => {
        const entryToIndex = prepareEntryToIndex({
            originalEntry: mockInputEntry as any,
            storageEntry: mockInputEntry as any,
            model: mockModel,
            context: { plugins } as any
        });

        expect(entryToIndex).toEqual(mockIndexedEntry);
    });

    test("should extract original entry from indexed data", () => {
        const [entryFromIndex] = extractEntriesFromIndex({
            model: mockModel,
            context: { plugins } as any,
            entries: [mockIndexedEntry as any]
        });

        expect(entryFromIndex.values).toEqual(mockInputEntry.values);
    });
});

import { useContentGqlHandler } from "../utils/useContentGqlHandler";
import { CmsContentEntryType, CmsContentModelGroupType } from "@webiny/api-headless-cms/types";
import models from "./mocks/contentModels";
import { useProductManageHandler } from "../utils/useProductManageHandler";
import { useCategoryManageHandler } from "../utils/useCategoryManageHandler";
import { useProductReadHandler } from "../utils/useProductReadHandler";

const richTextMock = [
    {
        tag: "h1",
        content: "Testing H1 tags"
    },
    {
        tag: "p",
        content: "Some small piece of text to test P tags"
    }
];

describe("refField", () => {
    const esCmsIndex = "root-headless-cms";

    const manageOpts = { path: "manage/en-US" };
    const readOpts = { path: "read/en-US" };

    const {
        elasticSearch,
        createContentModelMutation,
        updateContentModelMutation,
        createContentModelGroupMutation
    } = useContentGqlHandler(manageOpts);

    // This function is not directly within `beforeEach` as we don't always setup the same content model.
    // We call this function manually at the beginning of each test, where needed.
    const setupContentModelGroup = async (): Promise<CmsContentModelGroupType> => {
        const [createCMG] = await createContentModelGroupMutation({
            data: {
                name: "Group",
                slug: "group",
                icon: "ico/ico",
                description: "description"
            }
        });
        return createCMG.data.createContentModelGroup.data;
    };

    const setupContentModel = async (contentModelGroup: CmsContentModelGroupType, name: string) => {
        const model = models.find(m => m.modelId === name);
        // Create initial record
        const [create] = await createContentModelMutation({
            data: {
                name: model.name,
                modelId: model.modelId,
                group: contentModelGroup.id
            }
        });

        if (create.errors) {
            console.error(`[beforeEach] ${create.errors[0].message}`);
            process.exit(1);
        }

        const [update] = await updateContentModelMutation({
            modelId: create.data.createContentModel.data.modelId,
            data: {
                fields: model.fields,
                layout: model.layout
            }
        });
        return update.data.updateContentModel.data;
    };
    const setupContentModels = async (contentModelGroup: CmsContentModelGroupType) => {
        const models = {
            category: null,
            product: null,
            review: null,
            author: null
        };
        for (const name in models) {
            models[name] = await setupContentModel(contentModelGroup, name);
        }
        return models;
    };

    const createCategory = async () => {
        const { createCategory, publishCategory } = useCategoryManageHandler({
            ...manageOpts
        });
        const [createCategoryResponse] = await createCategory({
            data: {
                title: "Vegetables",
                slug: "vegetables"
            }
        });
        const category = createCategoryResponse.data.createCategory.data as CmsContentEntryType;

        await publishCategory({
            revision: category.id
        });

        return category;
    };

    beforeEach(async () => {
        try {
            await elasticSearch.indices.create({ index: esCmsIndex });
        } catch {}
    });

    afterEach(async () => {
        try {
            await elasticSearch.indices.delete({ index: esCmsIndex });
        } catch {}
    });

    test("should create a product with richText field populated", async () => {
        const contentModelGroup = await setupContentModelGroup();
        await setupContentModels(contentModelGroup);

        const category = await createCategory();

        const { createProduct, publishProduct } = useProductManageHandler({
            ...manageOpts
        });

        const { until, getProduct } = useProductReadHandler({
            ...readOpts
        });

        const [createProductResponse] = await createProduct({
            data: {
                title: "Potato",
                price: 100,
                availableOn: "2020-12-25T16:37:00Z.000",
                color: "white",
                availableSizes: ["s", "m"],
                image: "file.jpg",
                category: {
                    modelId: "category",
                    entryId: category.id
                },
                richText: richTextMock
            }
        });

        expect(createProductResponse).toEqual({
            data: {
                createProduct: {
                    data: {
                        id: expect.any(String),
                        createdOn: expect.stringMatching(/^20/),
                        savedOn: expect.stringMatching(/^20/),
                        title: "Potato",
                        price: 100,
                        availableOn: expect.stringMatching(/^20/),
                        color: "white",
                        availableSizes: ["s", "m"],
                        category: {
                            modelId: "category",
                            entryId: category.id
                        },
                        richText: richTextMock,
                        inStock: null,
                        itemsInStock: null,
                        meta: {
                            locked: false,
                            modelId: "product",
                            publishedOn: null,
                            revisions: [
                                {
                                    id: expect.any(String),
                                    title: "Potato"
                                }
                            ],
                            status: "draft",
                            title: "Potato",
                            version: 1
                        }
                    },
                    error: null
                }
            }
        });

        const product = createProductResponse.data.createProduct.data;

        await publishProduct({
            revision: product.id
        });

        // If this `until` resolves successfully, we know entry is accessible via the "read" API
        await until(
            () =>
                getProduct({
                    where: {
                        id: product.id
                    }
                }).then(([data]) => data),
            ({ data }) => data.getProduct.data.id === product.id,
            { name: "get created product" }
        );

        const [response] = await getProduct({
            where: {
                id: product.id
            }
        });

        expect(response).toEqual({
            data: {
                getProduct: {
                    data: {
                        id: expect.any(String),
                        createdOn: expect.stringMatching(/^20/),
                        savedOn: expect.stringMatching(/^20/),
                        title: "Potato",
                        price: 100,
                        availableOn: expect.stringMatching(/^20/),
                        color: "white",
                        availableSizes: ["s", "m"],
                        category: {
                            id: expect.any(String),
                            title: "Vegetables"
                        },
                        richText: richTextMock,
                        inStock: null,
                        itemsInStock: null
                    },
                    error: null
                }
            }
        });
    });
});

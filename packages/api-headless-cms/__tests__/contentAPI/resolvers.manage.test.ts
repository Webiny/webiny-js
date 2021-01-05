/* eslint-disable */
import { CmsContentModelGroupType } from "@webiny/api-headless-cms/types";
import { useContentGqlHandler } from "../utils/useContentGqlHandler";
import { useCategoryManageHandler } from "../utils/useCategoryManageHandler";
import { useCategoryReadHandler } from "../utils/useCategoryReadHandler";
import models from "./mocks/contentModels";
import modelsWithoutValidation from "./mocks/contentModels.noValidation";

jest.setTimeout(10000);

describe("MANAGE - Resolvers", () => {
    let contentModelGroup: CmsContentModelGroupType;

    const esCmsIndex = "root-headless-cms";

    const manageOpts = { path: "manage/en-US" };
    const readOpts = { path: "read/en-US" };

    const {
        until,
        elasticSearch,
        createContentModelMutation,
        updateContentModelMutation,
        createContentModelGroupMutation
    } = useContentGqlHandler(manageOpts);

    // This function is not directly within `beforeEach` as we don't always setup the same content model.
    // We call this function manually at the beginning of each test, where needed.
    const setupContentModel = async (model = null) => {
        if (!model) {
            model = models.find(m => m.modelId === "category");
        }
        const [createCMG] = await createContentModelGroupMutation({
            data: {
                name: "Group",
                slug: "group",
                icon: "ico/ico",
                description: "description"
            }
        });
        contentModelGroup = createCMG.data.createContentModelGroup.data;

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

        if (update.errors) {
            console.error(`[beforeEach] ${update.errors[0].message}`);
            process.exit(1);
        }
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

    test(`get category`, async () => {
        await setupContentModel();
        const { createCategory, getCategory, listCategories } = useCategoryManageHandler(
            manageOpts
        );

        const [create] = await createCategory({ data: { title: "Hardware", slug: "hardware" } });

        const { id } = create.data.createCategory.data;

        // Need to wait until the new entry is propagated to Elastic Search index
        await until(
            () => listCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === id
        );

        const [response] = await getCategory({ revision: id });

        expect(response.data.getCategory.data).toMatchObject({
            id,
            createdOn: /^20/,
            savedOn: /^20/,
            title: "Hardware",
            slug: "hardware",
            meta: {
                title: "Hardware",
                modelId: "category",
                version: 1,
                locked: false,
                publishedOn: null,
                status: "draft",
                revisions: [
                    {
                        id: expect.any(String),
                        title: "Hardware",
                        slug: "hardware"
                    }
                ]
            }
        });
    });

    test(`list categories (no parameters)`, async () => {
        await setupContentModel();
        // Use "manage" API to create and publish entries
        const { until, createCategory, publishCategory, listCategories } = useCategoryManageHandler(
            manageOpts
        );

        // Create an entry
        const [create] = await createCategory({ data: { title: "Title 1", slug: "slug-1" } });
        const category = create.data.createCategory.data;
        const { id } = category;

        // Publish it so it becomes available in the "read" API
        const [publishCategoryResponse] = await publishCategory({ revision: id });

        const { publishedOn } = publishCategoryResponse.data.publishCategory.data.meta;

        // If this `until` resolves successfully, we know entry is accessible via the "read" API
        await until(
            () => listCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].meta.status === "published",
            { name: "wait for entry to be published" }
        );

        const [response] = await listCategories();

        expect(response).toEqual({
            data: {
                listCategories: {
                    data: [
                        {
                            id: category.id,
                            title: category.title,
                            slug: category.slug,
                            createdOn: category.createdOn,
                            savedOn: category.savedOn,
                            meta: {
                                locked: true,
                                modelId: "category",
                                publishedOn: publishedOn,
                                revisions: [
                                    {
                                        id: category.id,
                                        slug: "slug-1",
                                        title: "Title 1"
                                    }
                                ],
                                status: "published",
                                title: "Title 1",
                                version: 1
                            }
                        }
                    ],
                    error: null,
                    meta: {
                        hasMoreItems: false,
                        totalCount: 1,
                        cursor: expect.any(String)
                    }
                }
            }
        });
    });

    test("get entries by given ids", async () => {
        await setupContentModel();
        // Use "manage" API to create and publish entries
        const { createCategory, getCategoriesByIds } = useCategoryManageHandler(manageOpts);

        const [fruitsResponse] = await createCategory({
            data: {
                title: "Fruits",
                slug: "fruits"
            }
        });
        const fruits = fruitsResponse.data.createCategory.data;
        await createCategory({
            data: {
                title: "Vegetables",
                slug: "vegetables"
            }
        });

        const [animalsResponse] = await createCategory({
            data: {
                title: "Animals",
                slug: "animals"
            }
        });
        const animals = animalsResponse.data.createCategory.data;
        await createCategory({
            data: {
                title: "Trees",
                slug: "trees"
            }
        });

        const [response] = await getCategoriesByIds({
            revisions: [fruits.id, animals.id]
        });

        expect(response).toEqual({
            data: {
                getCategoriesByIds: {
                    data: [fruits, animals],
                    error: null
                }
            }
        });
    });

    test(`list entries (limit)`, async () => {
        await setupContentModel();
        const query = /* GraphQL */ `
            {
                listCategories(limit: 1) {
                    data {
                        id
                    }
                }
            }
        `;
    });

    test(`list categories (sort ASC)`, async () => {
        await setupContentModel();
        // Test resolvers
        const query = /* GraphQL */ `
            query ListCategories($sort: [CategoryListSorter]) {
                listCategories(sort: $sort) {
                    data {
                        title
                    }
                }
            }
        `;
    });

    test(`list categories (sort DESC)`, async () => {
        await setupContentModel();
        // Test resolvers
        const query = /* GraphQL */ `
            query ListCategories($sort: [CategoryListSorter]) {
                listCategories(sort: $sort) {
                    data {
                        title
                    }
                }
            }
        `;
    });

    test(`list categories (contains, not_contains, in, not_in)`, async () => {
        await setupContentModel();
        // Test resolvers
        const query = /* GraphQL */ `
            query ListCategories($where: CategoryListWhereInput) {
                listCategories(where: $where) {
                    data {
                        title
                    }
                    error {
                        message
                    }
                }
            }
        `;
    });

    test(`should create category`, async () => {
        await setupContentModel();
        const { until, createCategory, listCategories } = useCategoryManageHandler(manageOpts);
        const [create1] = await createCategory({ data: { title: "Hardware", slug: "hardware" } });

        const category1 = create1.data.createCategory.data;

        expect(category1).toMatchObject({
            id: expect.any(String),
            createdOn: /^20/,
            savedOn: /^20/,
            title: "Hardware",
            slug: "hardware",
            meta: {
                title: "Hardware",
                modelId: "category",
                version: 1,
                locked: false,
                publishedOn: null,
                status: "draft",
                revisions: [
                    {
                        id: expect.any(String),
                        title: "Hardware",
                        slug: "hardware"
                    }
                ]
            }
        });

        await until(
            () => listCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === category1.id
        );
    });

    test(`should return validation error`, async () => {
        await setupContentModel();
        const { createCategory } = useCategoryManageHandler(manageOpts);

        const [create] = await createCategory({ data: { title: "Hardware" } });

        const { error } = create.data.createCategory;

        expect(error).toMatchObject({
            code: "VALIDATION_FAILED",
            data: expect.arrayContaining([
                expect.objectContaining({
                    fieldId: expect.any(String),
                    error: expect.any(String)
                })
            ])
        });
    });

    test(`should create an entry (fields without validation)`, async () => {
        const model = modelsWithoutValidation.find(m => m.modelId === "category");
        await setupContentModel(model);

        const { until, createCategory, listCategories } = useCategoryManageHandler(manageOpts);
        const [result] = await createCategory({ data: { title: "Hardware", slug: "hardware" } });

        const category = result.data.createCategory.data;

        expect(category).toMatchObject({
            id: expect.any(String),
            createdOn: /^20/,
            savedOn: /^20/,
            title: "Hardware",
            slug: "hardware",
            meta: {
                title: "Hardware",
                modelId: "category",
                version: 1,
                locked: false,
                publishedOn: null,
                status: "draft",
                revisions: [
                    {
                        id: expect.any(String),
                        title: "Hardware",
                        slug: "hardware"
                    }
                ]
            }
        });

        await until(
            () => listCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === category.id
        );
    });

    test(`create category revision`, async () => {
        await setupContentModel();

        const {
            until,
            createCategory,
            createCategoryFrom,
            listCategories
        } = useCategoryManageHandler(manageOpts);

        const [create] = await createCategory({ data: { title: "Hardware", slug: "hardware" } });
        const { id } = create.data.createCategory.data;

        // Wait until the new category is propagated to ES index (listCategories works with ES directly in MANAGE API)
        await until(
            () => listCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === id
        );

        const [revision] = await createCategoryFrom({ revision: id });

        const newEntry = revision.data.createCategoryFrom.data;
        expect(newEntry).toMatchObject({
            id: expect.any(String),
            title: "Hardware",
            slug: "hardware",
            meta: {
                version: 2
            }
        });

        expect(newEntry.meta.revisions.length).toBe(2);

        // Wait until the new category revision is propagated to ES index
        const response = await until(
            () => listCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === newEntry.id
        );

        expect(response).toMatchObject({
            data: {
                listCategories: {
                    data: [newEntry],
                    meta: {
                        hasMoreItems: false,
                        totalCount: 1,
                        cursor: expect.any(String)
                    },
                    error: null
                }
            }
        });
    });

    test(`update category`, async () => {
        await setupContentModel();
        const { until, createCategory, updateCategory, listCategories } = useCategoryManageHandler(
            manageOpts
        );
        const [create] = await createCategory({ data: { title: "Hardware", slug: "hardware" } });

        const createdCategory = create.data.createCategory.data;

        const [response] = await updateCategory({
            revision: createdCategory.id,
            data: { title: "New title", slug: "hardware-store" }
        });

        expect(response).toMatchObject({
            data: {
                updateCategory: {
                    data: {
                        id: expect.any(String),
                        savedOn: /^20/,
                        title: "New title",
                        slug: "hardware-store",
                        meta: {
                            title: "New title"
                        }
                    },
                    error: null
                }
            }
        });

        const updatedCategory = response.data.updateCategory.data;

        const createdOn = new Date(create.data.createCategory.data.savedOn).getTime();
        const updatedOn = new Date(updatedCategory.savedOn).getTime();
        expect(createdOn).toBeLessThan(updatedOn);

        // If this `until` resolves successfully, we know entry is accessible via the "read" API
        const listCategoriesResponse = await until(
            () => listCategories({}).then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === updatedCategory.id,
            { name: "create category" }
        );
    });

    test(`delete category`, async () => {
        await setupContentModel();
        const {
            until,
            createCategory,
            createCategoryFrom,
            getCategory,
            listCategories,
            deleteCategory
        } = useCategoryManageHandler(manageOpts);

        const [revision1] = await createCategory({ data: { title: "Hardware", slug: "hardware" } });

        const { id } = revision1.data.createCategory.data;

        await until(
            () => listCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data.length > 0,
            { name: "create first revision" }
        );

        // Create 2 more revisions
        const [revision2] = await createCategoryFrom({ revision: id });
        const { id: id2 } = revision2.data.createCategoryFrom.data;

        const [revision3] = await createCategoryFrom({ revision: id });
        const { id: id3 } = revision3.data.createCategoryFrom.data;

        // Wait until the new revision is indexed in Elastic as "latest"
        await until(
            () => listCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === id3,
            { name: "create 2 more revisions" }
        );

        // Delete latest revision
        await deleteCategory({ revision: id3 });

        // Wait until the previous revision is indexed in Elastic as "latest"
        await until(
            () => listCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === id2,
            { name: "delete latest revision" }
        );

        // Make sure revision #2 is now "latest"
        const [list2] = await listCategories();
        const { data: data2 } = list2.data.listCategories;
        expect(data2.length).toBe(1);
        expect(data2[0].id).toEqual(id2);

        // Delete revision #1; Revision #2 should still be "latest"
        await deleteCategory({ revision: id });

        // Get revision #2 and verify it's the only remaining revision of this form
        const [get] = await getCategory({ revision: id2 });
        const { meta } = get.data.getCategory.data;
        expect(meta.version).toBe(2);
        expect(meta.revisions.length).toBe(1);
        expect(meta.revisions[0].id).toEqual(id2);
    });

    test(`publish and unpublish a category`, async () => {
        await setupContentModel();
        const {
            until,
            createCategory,
            createCategoryFrom,
            listCategories: listLatestCategories,
            publishCategory,
            unpublishCategory
        } = useCategoryManageHandler(manageOpts);

        const { listCategories: listPublishedCategories } = useCategoryReadHandler(readOpts);

        const [revision1] = await createCategory({ data: { title: "Hardware", slug: "hardware" } });

        const { id } = revision1.data.createCategory.data;

        await until(
            () => listLatestCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data.length > 0,
            { name: "create first revision" }
        );

        // Create 2 more revisions
        const [revision2] = await createCategoryFrom({ revision: id });
        const { id: id2 } = revision2.data.createCategoryFrom.data;

        const [revision3] = await createCategoryFrom({ revision: id });
        const { id: id3 } = revision3.data.createCategoryFrom.data;

        // Wait until the new revision is indexed in Elastic as "latest"
        await until(
            () => listLatestCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === id3,
            { name: "create 2 more revisions" }
        );

        // Publish latest revision
        const [res] = await publishCategory({ revision: id3 });

        // Wait until the previous revision is indexed in Elastic as "published"
        await until(
            () => listPublishedCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === id3,
            { name: "publish latest revision" }
        );

        const [unpublish] = await unpublishCategory({ revision: id3 });

        if (unpublish.data.unpublishCategory.error) {
            console.log(unpublish.data.unpublishCategory.error);
            process.exit(1);
        }

        expect(unpublish.data.unpublishCategory.data.meta.status).toBe("unpublished");

        // Wait until there are no categories available in READ API
        await until(
            () => listPublishedCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data.length === 0,
            { name: "unpublish revision" }
        );

        // Publish the latest revision again
        const [publish2] = await publishCategory({ revision: id3 });

        // Wait until the previous revision is indexed in Elastic as "published"
        await until(
            () => listPublishedCategories().then(([data]) => data),
            ({ data }) => data.listCategories.data[0].id === id3,
            { name: "publish latest revision again" }
        );
    });
});

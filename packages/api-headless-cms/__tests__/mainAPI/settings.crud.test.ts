import { useAdminGqlHandler } from "../utils/useAdminGqlHandler";
import { useContentGqlHandler } from "../utils/useContentGqlHandler";
import { createIdentity } from "../utils/helpers";

describe("Settings crud test", () => {
    const manageOpts = {
        path: "manage/en-US"
    };

    const { listContentModelGroupsQuery } = useContentGqlHandler({
        ...manageOpts
    });

    const { installMutation } = useAdminGqlHandler({
        ...manageOpts
    });

    const {
        isInstalledQuery,
        installMutation: installMutationNoPermission,
        elasticSearch
    } = useAdminGqlHandler({
        ...manageOpts,
        permissions: []
    });

    const esCmsIndex = "root-headless-cms";

    beforeEach(async () => {
        try {
            await elasticSearch.indices.create({ index: esCmsIndex });
        } catch {
            // Ignore errors
        }
    });

    afterEach(async () => {
        try {
            await elasticSearch.indices.delete({ index: esCmsIndex });
        } catch (e) {}
    });

    test("cms is not installed yet", async () => {
        const [response] = await isInstalledQuery();
        expect(response).toEqual({
            data: {
                cms: {
                    isInstalled: {
                        data: false,
                        error: null
                    }
                }
            }
        });

        const [afterInsertResponse] = await isInstalledQuery();
        expect(afterInsertResponse).toEqual({
            data: {
                cms: {
                    isInstalled: {
                        data: false,
                        error: null
                    }
                }
            }
        });
    });

    test("cms is being installed", async () => {
        await installMutation();

        const [response] = await isInstalledQuery();
        expect(response).toEqual({
            data: {
                cms: {
                    isInstalled: {
                        data: true,
                        error: null
                    }
                }
            }
        });

        const [listContentModelGroupsResponse] = await listContentModelGroupsQuery();

        expect(listContentModelGroupsResponse).toEqual({
            data: {
                listContentModelGroups: {
                    data: [
                        {
                            id: expect.any(String),
                            createdBy: createIdentity(),
                            createdOn: expect.stringMatching(/^20/),
                            savedOn: expect.stringMatching(/^20/),
                            description: "A generic content model group",
                            icon: "fas/star",
                            name: "Ungrouped",
                            slug: "ungrouped"
                        }
                    ],
                    error: null
                }
            }
        });
    });

    test("cms is already installed", async () => {
        await installMutation();

        const [response] = await installMutation();
        expect(response).toEqual({
            data: {
                cms: {
                    install: {
                        data: null,
                        error: {
                            message: "The app is already installed.",
                            code: "CMS_INSTALLATION_ERROR",
                            data: null
                        }
                    }
                }
            }
        });
    });

    test("cms install", async () => {
        const [response] = await installMutation();
        expect(response).toEqual({
            data: {
                cms: {
                    install: {
                        data: true,
                        error: null
                    }
                }
            }
        });

        const [isInstalledResponse] = await isInstalledQuery();
        expect(isInstalledResponse).toEqual({
            data: {
                cms: {
                    isInstalled: {
                        data: true,
                        error: null
                    }
                }
            }
        });
    });

    test("should not install due to lack of permissions", async () => {
        const [response] = await installMutationNoPermission();

        expect(response).toEqual({
            data: {
                cms: {
                    install: {
                        data: null,
                        error: {
                            code: "CMS_INSTALLATION_CONTENT_MODEL_GROUP_ERROR",
                            message: "Not authorized!",
                            data: null
                        }
                    }
                }
            }
        });
    });
});

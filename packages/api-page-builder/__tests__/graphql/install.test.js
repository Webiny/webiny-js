import useGqlHandler from "./useGqlHandler";

describe("Install Test", () => {
    const {
        isInstalled,
        install,
        listCategories,
        createElasticSearchIndex,
        deleteElasticSearchIndex,
        listPages,
        listPublishedPages,
        getPage,
        getPublishedPage,
        until,
        getSettings
    } = useGqlHandler();

    beforeAll(async () => {
        await deleteElasticSearchIndex();
    });

    beforeEach(async () => {
        await createElasticSearchIndex();
    });

    afterEach(async () => {
        await deleteElasticSearchIndex();
    });

    test("should be able to run isInstalled anonymously, but not install", async () => {
        const { isInstalled, install } = useGqlHandler({
            identity: null,
            permissions: []
        });

        await isInstalled().then(([res]) =>
            expect(res).toEqual({
                data: {
                    pageBuilder: {
                        isInstalled: {
                            data: false,
                            error: null
                        }
                    }
                }
            })
        );

        await install({
            data: {
                name: "My Site"
            }
        }).then(([res]) =>
            expect(res).toEqual({
                data: {
                    pageBuilder: {
                        install: null
                    }
                },
                errors: [
                    {
                        locations: [
                            {
                                column: 13,
                                line: 4
                            }
                        ],
                        message: "Not authorized!",
                        path: ["pageBuilder", "install"]
                    }
                ]
            })
        );
    });

    test("make sure installation creates initial resources and marks the app as installed", async () => {
        await isInstalled().then(([res]) =>
            expect(res).toEqual({
                data: {
                    pageBuilder: {
                        isInstalled: {
                            data: false,
                            error: null
                        }
                    }
                }
            })
        );

        await install({
            data: {
                name: "My Website"
            }
        }).then(([res]) =>
            expect(res).toEqual({
                data: {
                    pageBuilder: {
                        install: {
                            data: true,
                            error: null
                        }
                    }
                }
            })
        );

        await isInstalled().then(([res]) =>
            expect(res).toEqual({
                data: {
                    pageBuilder: {
                        isInstalled: {
                            data: true,
                            error: null
                        }
                    }
                }
            })
        );

        // 1. Installation must create the initial Static category.
        await listCategories().then(([res]) =>
            expect(res).toMatchObject({
                data: {
                    pageBuilder: {
                        listCategories: {
                            data: [
                                {
                                    slug: "static",
                                    url: "/static/",
                                    name: "Static",
                                    layout: "static",
                                    createdBy: {
                                        id: "mocked",
                                        displayName: "m"
                                    }
                                }
                            ],
                            error: null
                        }
                    }
                }
            })
        );

        // 2. Only homepage should be visible in published and latest pages.
        await until(listPages, ([res]) => {
            const { data } = res.data.pageBuilder.listPages;
            return data.length === 1 && data[0].status === "published";
        }).then(([res]) => {
            expect(res.data.pageBuilder.listPages.data[0].title).toBe("Welcome to Webiny");
            expect(res.data.pageBuilder.listPages.data[0].status).toBe("published");
        });

        await until(listPublishedPages, ([res]) => {
            const { data } = res.data.pageBuilder.listPublishedPages;
            return data.length === 1 && data[0].status === "published";
        }).then(([res]) => {
            expect(res.data.pageBuilder.listPublishedPages.data[0].title).toBe("Welcome to Webiny");
            expect(res.data.pageBuilder.listPublishedPages.data[0].status).toBe("published");
        });

        // 3. Let's get the ID of the not-found page and try to get it directly.
        const settings = await getSettings().then(([res]) => res.data.pageBuilder.getSettings.data);

        await getPage({ id: settings.pages.notFound }).then(([res]) => {
            expect(res.data.pageBuilder.getPage.data.title).toBe("Not Found");
            expect(res.data.pageBuilder.getPage.data.status).toBe("published");
        });

        await getPublishedPage({ id: settings.pages.notFound }).then(([res]) => {
            expect(res.data.pageBuilder.getPublishedPage.data.title).toBe("Not Found");
            expect(res.data.pageBuilder.getPublishedPage.data.status).toBe("published");
        });

        // 4. Installation must set the "Website" name.
        await getSettings().then(([res]) =>
            expect(res).toMatchObject({
                data: {
                    pageBuilder: {
                        getSettings: {
                            data: {
                                name: "My Website"
                            }
                        }
                    }
                }
            })
        );
    });
});

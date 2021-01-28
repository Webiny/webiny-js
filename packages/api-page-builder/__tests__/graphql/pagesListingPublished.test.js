import useGqlHandler from "./useGqlHandler";

jest.setTimeout(15000);

describe("listing published pages", () => {
    const {
        deleteElasticSearchIndex,
        createCategory,
        createPage,
        publishPage,
        listPublishedPages,
        updatePage,
        logsDb,
        until
    } = useGqlHandler();

    let initiallyCreatedPagesIds;

    beforeEach(async () => {
        initiallyCreatedPagesIds = [];
        await deleteElasticSearchIndex();
        await createCategory({
            data: {
                slug: `category`,
                name: `name`,
                url: `/some-url/`,
                layout: `layout`
            }
        });

        const letters = ["a", "z", "b", "x", "c"];
        for (let i = 0; i < 5; i++) {
            const [response] = await createPage({ category: "category" });
            const { id } = response.data.pageBuilder.createPage.data;

            await updatePage({
                id,
                data: {
                    title: `page-${letters[i]}`
                }
            });

            initiallyCreatedPagesIds.push(id);

            // Publish pages.
            if (["a", "b", "c"].includes(letters[i])) {
                await publishPage({
                    id
                });
            }
        }
    });

    test("sorting", async () => {
        // 1. Check if all were returned and sorted `createdOn: asc`.
        await until(
            () => listPublishedPages({ sort: { createdOn: "desc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data[0].title === "page-c"
        ).then(([response]) =>
            expect(response).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [{ title: "page-c" }, { title: "page-b" }, { title: "page-a" }]
                        }
                    }
                }
            })
        );

        // 2. Check if all were returned and sorted `createdOn: asc`.
        await until(
            () => listPublishedPages({ sort: { createdOn: "asc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data[0].title === "page-a"
        ).then(([res]) =>
            expect(res).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [{ title: "page-a" }, { title: "page-b" }, { title: "page-c" }]
                        }
                    }
                }
            })
        );

        // 3. Check if all were returned and sorted `title: asc`.
        await until(
            () => listPublishedPages({ sort: { title: "asc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data[0].title === "page-a"
        ).then(([res]) =>
            expect(res).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [{ title: "page-a" }, { title: "page-b" }, { title: "page-c" }]
                        }
                    }
                }
            })
        );

        // 4. Check if all were returned and sorted `title: desc`.
        await until(
            () => listPublishedPages({ sort: { title: "desc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data[0].title === "page-c"
        ).then(([res]) =>
            expect(res).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [{ title: "page-c" }, { title: "page-b" }, { title: "page-a" }]
                        }
                    }
                }
            })
        );
    });

    test("filtering by category", async () => {
        await createCategory({
            data: {
                slug: `custom`,
                name: `name`,
                url: `/some-url/`,
                layout: `layout`
            }
        });

        const letters = ["j", "n", "k", "m", "l"];
        // Test creating, getting and updating three pages.
        for (let i = 0; i < letters.length; i++) {
            const letter = letters[i];
            const [response] = await createPage({ category: "custom" });
            const { id } = response.data.pageBuilder.createPage.data;

            await updatePage({
                id,
                data: {
                    title: `page-${letter}`
                }
            });

            // Publish pages.
            if (["j", "k", "l"].includes(letters[i])) {
                await publishPage({
                    id
                });
            }
        }

        // List should show six published pages.
        // 1. Check if all were returned and sorted `createdOn: desc`.
        await until(
            () => listPublishedPages({ sort: { createdOn: "desc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data[0].title === "page-l"
        ).then(([response]) =>
            expect(response).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [
                                { title: "page-l" },
                                { title: "page-k" },
                                { title: "page-j" },
                                { title: "page-c" },
                                { title: "page-b" },
                                { title: "page-a" }
                            ]
                        }
                    }
                }
            })
        );

        // 2. Check if `category: custom` were returned.
        await until(
            () =>
                listPublishedPages({ sort: { createdOn: "desc" }, where: { category: "custom" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data[0].title === "page-l"
        ).then(([response]) =>
            expect(response).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [{ title: "page-l" }, { title: "page-k" }, { title: "page-j" }]
                        }
                    }
                }
            })
        );

        // 2.1. Check if `category: category` pages were returned.
        await until(
            () =>
                listPublishedPages({
                    sort: { createdOn: "desc" },
                    where: { category: "category" }
                }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data[0].title === "page-c"
        ).then(([response]) =>
            expect(response).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [{ title: "page-c" }, { title: "page-b" }, { title: "page-a" }]
                        }
                    }
                }
            })
        );

        // 3. Check if `category: custom` were returned and sorted `title: asc`.
        await until(
            () => listPublishedPages({ where: { category: "custom" }, sort: { title: "asc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data[0].title === "page-j"
        ).then(([response]) =>
            expect(response).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [{ title: "page-j" }, { title: "page-k" }, { title: "page-l" }]
                        }
                    }
                }
            })
        );

        // 3.1. Check if `category: category` pages were returned.
        await until(
            () => listPublishedPages({ where: { category: "category" }, sort: { title: "asc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data[0].title === "page-a"
        ).then(([response]) =>
            expect(response).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [{ title: "page-a" }, { title: "page-b" }, { title: "page-c" }]
                        }
                    }
                }
            })
        );
    });

    test("pagination", async () => {
        await until(
            () => listPublishedPages({ sort: { createdOn: "desc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 3
        ).then(([res]) =>
            expect(res.data.pageBuilder.listPublishedPages.meta).toEqual({
                from: 1,
                limit: 10,
                nextPage: null,
                page: 1,
                previousPage: null,
                to: 3,
                totalCount: 3,
                totalPages: 1
            })
        );

        await until(
            () => listPublishedPages({ sort: { createdOn: "desc" }, limit: 1 }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 1
        ).then(([res]) => {
            expect(res.data.pageBuilder.listPublishedPages.data[0].title).toBe("page-c");
            expect(res.data.pageBuilder.listPublishedPages.meta).toEqual({
                from: 1,
                limit: 1,
                nextPage: 2,
                page: 1,
                previousPage: null,
                to: 1,
                totalCount: 3,
                totalPages: 3
            });
        });

        await until(
            () => listPublishedPages({ sort: { createdOn: "desc" }, page: 3, limit: 1 }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 1
        ).then(([res]) => {
            expect(res.data.pageBuilder.listPublishedPages.data[0].title).toBe("page-a");
            expect(res.data.pageBuilder.listPublishedPages.meta).toEqual({
                from: 3,
                limit: 1,
                nextPage: null,
                page: 3,
                previousPage: 2,
                to: 3,
                totalCount: 3,
                totalPages: 3
            });
        });

        await until(
            () => listPublishedPages({ sort: { createdOn: "desc" }, page: 3, limit: 1 }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 1
        ).then(([res]) => {
            expect(res.data.pageBuilder.listPublishedPages.data[0].title).toBe("page-a");
            expect(res.data.pageBuilder.listPublishedPages.meta).toEqual({
                from: 3,
                limit: 1,
                nextPage: null,
                page: 3,
                previousPage: 2,
                to: 3,
                totalCount: 3,
                totalPages: 3
            });
        });

        await until(
            () => listPublishedPages({ page: 2, limit: 2, sort: { title: "asc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 1
        ).then(([res]) => {
            expect(res).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [{ title: "page-c" }]
                        }
                    }
                }
            });
            expect(res.data.pageBuilder.listPublishedPages.meta).toEqual({
                from: 3,
                limit: 2,
                nextPage: null,
                page: 2,
                previousPage: 1,
                to: 3,
                totalCount: 3,
                totalPages: 2
            });
        });

        await until(
            () => listPublishedPages({ page: 3, limit: 1, sort: { title: "desc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 1
        ).then(([res]) => {
            {
                expect(res).toMatchObject({
                    data: {
                        pageBuilder: {
                            listPublishedPages: {
                                data: [{ title: "page-a" }]
                            }
                        }
                    }
                });
                expect(res.data.pageBuilder.listPublishedPages.meta).toEqual({
                    from: 3,
                    limit: 1,
                    nextPage: null,
                    page: 3,
                    previousPage: 2,
                    to: 3,
                    totalCount: 3,
                    totalPages: 3
                });
            }
        });
    });

    test("filtering by tags", async () => {
        const letters = ["j", "n", "k", "m", "l"];
        for (let i = 0; i < 5; i++) {
            const [response] = await createPage({ category: "category" });
            const { id } = response.data.pageBuilder.createPage.data;

            await updatePage({
                id,
                data: {
                    title: `page-${letters[i]}`
                }
            });

            // Add tags and publish pages.
            const tags = {
                j: ["news"],
                k: ["news", "world"],
                l: ["news", "local"]
            };

            if (["j", "k", "l"].includes(letters[i])) {
                await updatePage({
                    id,
                    data: {
                        settings: {
                            general: {
                                tags: tags[letters[i]]
                            }
                        }
                    }
                });

                await publishPage({
                    id
                });
            }
        }

        // Just in case, ensure all pages are present.
        await until(
            () => listPublishedPages({ sort: { createdOn: "desc" } }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data[0].title === "page-l"
        ).then(([res]) => expect(res.data.pageBuilder.listPublishedPages.data.length).toBe(6));

        // The following are testing "all tags must be matched" mode.
        await until(
            () =>
                listPublishedPages({
                    sort: { createdOn: "desc" },
                    where: { tags: { query: ["news"] } }
                }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 3
        ).then(([res]) =>
            expect(res.data.pageBuilder.listPublishedPages.data).toMatchObject([
                { title: "page-l" },
                { title: "page-k" },
                { title: "page-j" }
            ])
        );

        await until(
            () =>
                listPublishedPages({
                    sort: { createdOn: "desc" },
                    where: {
                        tags: {
                            query: ["world", "news"]
                        }
                    }
                }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 1
        ).then(([res]) =>
            expect(res.data.pageBuilder.listPublishedPages.data).toMatchObject([
                { title: "page-k" }
            ])
        );

        await until(
            () =>
                listPublishedPages({
                    sort: { createdOn: "desc" },
                    where: {
                        tags: {
                            query: ["local", "news"]
                        }
                    }
                }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 1
        ).then(([res]) =>
            expect(res.data.pageBuilder.listPublishedPages.data).toMatchObject([
                { title: "page-l" }
            ])
        );

        // The following are testing "at least one tag must be matched" mode.

        // 1. Let's just check if the `allTags: true` returns 1 result (so, the same as when not specified at all).
        await until(
            () =>
                listPublishedPages({
                    sort: { createdOn: "desc" },
                    where: {
                        tags: {
                            query: ["local", "news"]
                        }
                    }
                }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 1
        ).then(([res]) =>
            expect(res.data.pageBuilder.listPublishedPages.data).toMatchObject([
                { title: "page-l" }
            ])
        );

        // 2. This should return all pages.
        await until(
            () =>
                listPublishedPages({
                    sort: { createdOn: "desc" },
                    where: { tags: { query: ["local", "news"], rule: "any" } }
                }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 3
        ).then(([res]) =>
            expect(res.data.pageBuilder.listPublishedPages.data).toMatchObject([
                { title: "page-l" },
                { title: "page-k" },
                { title: "page-j" }
            ])
        );

        // 3. This should return two pages.
        await until(
            () =>
                listPublishedPages({
                    sort: { createdOn: "desc" },
                    where: { tags: { query: ["local", "world"], rule: "any" } }
                }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 2
        ).then(([res]) =>
            expect(res.data.pageBuilder.listPublishedPages.data).toMatchObject([
                { title: "page-l" },
                { title: "page-k" }
            ])
        );

        // 3.1. The same query, but with no rule specified (which means "all"), should return nothing.
        await until(
            () =>
                listPublishedPages({
                    sort: { createdOn: "desc" },
                    where: { tags: { query: ["local", "world"] } }
                }),
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 0
        );
    });

    test("sort by publishedOn", async () => {
        await publishPage({ id: initiallyCreatedPagesIds[1] });
        await publishPage({ id: initiallyCreatedPagesIds[3] });

        // We should still get all results when no filters are applied.
        // 1. Check if all were returned and sorted `createdOn: desc`.
        await until(
            listPublishedPages,
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 5
        );

        await listPublishedPages({
            sort: { publishedOn: "asc" }
        }).then(([res]) =>
            expect(res).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [
                                { title: "page-a", status: "published" },
                                { title: "page-b", status: "published" },
                                { title: "page-c", status: "published" },
                                { title: "page-z", status: "published" },
                                { title: "page-x", status: "published" }
                            ]
                        }
                    }
                }
            })
        );

        await listPublishedPages({
            sort: { publishedOn: "desc" }
        }).then(([res]) =>
            expect(res).toMatchObject({
                data: {
                    pageBuilder: {
                        listPublishedPages: {
                            data: [
                                { title: "page-x", status: "published" },
                                { title: "page-z", status: "published" },
                                { title: "page-c", status: "published" },
                                { title: "page-b", status: "published" },
                                { title: "page-a", status: "published" }
                            ]
                        }
                    }
                }
            })
        );
    });

    test("ensure we don't overload categories when listing pages", async () => {
        await until(
            listPublishedPages,
            ([res]) => res.data.pageBuilder.listPublishedPages.data.length === 3
        );

        // Let's use the `id` of the last log as the cursor.
        const [logs] = await logsDb.readLogs();
        const { id: cursor } = logs.pop();

        await listPublishedPages();

        // TODO fix this
        /* eslint-disable jest/valid-expect-in-promise */
        // When listing published pages, settings must have been loaded from the DB only once.
        const result = await logsDb
            .readLogs()
            .then(([logs]) => logs.filter(item => item.id > cursor))
            .then(logs => logs.filter(item => item.query.PK === "T#root#L#en-US#PB#C"));

        expect(result).toHaveLength(1);
    });
});

import { useContentGqlHandler } from "../utils/useContentGqlHandler";
import { CmsContentEntry, CmsContentModelGroup } from "../../src/types";
import models from "./mocks/contentModels";
import { usePatientManageHandler } from "../utils/usePatientManageHandler";
import { usePatientReadHandler } from "../utils/usePatientReadHandler";

jest.setTimeout(25000);

const REALLY_LONG_TEXT =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

describe("longTextField", () => {
    const manageOpts = { path: "manage/en-US" };
    const readOpts = { path: "read/en-US" };

    const {
        createContentModelMutation,
        updateContentModelMutation,
        createContentModelGroupMutation
    } = useContentGqlHandler(manageOpts);

    // This function is not directly within `beforeEach` as we don't always setup the same content model.
    // We call this function manually at the beginning of each test, where needed.
    const setupContentModelGroup = async (): Promise<CmsContentModelGroup> => {
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

    const setupContentModel = async (contentModelGroup: CmsContentModelGroup, name: string) => {
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

    const createPatient = async () => {
        const { createPatient, publishPatient } = usePatientManageHandler({
            ...manageOpts
        });
        const [createPatientResponse] = await createPatient({
            data: {
                name: "Jame Butler",
                bio: REALLY_LONG_TEXT,
                prescription: [REALLY_LONG_TEXT, REALLY_LONG_TEXT]
            }
        });

        const patient = createPatientResponse.data.createPatient.data as CmsContentEntry;

        await publishPatient({
            revision: patient.id
        });

        return patient;
    };

    test("should create a patient with long text field populated", async () => {
        const contentModelGroup = await setupContentModelGroup();
        await setupContentModel(contentModelGroup, "patient");
        const { getPatient, listPatients, until } = usePatientReadHandler({
            ...readOpts
        });

        const patient = await createPatient();

        expect(patient).toEqual({
            id: expect.any(String),
            createdOn: expect.stringMatching(/^20/),
            createdBy: {
                id: "123",
                displayName: "User 123",
                type: "admin"
            },
            savedOn: expect.stringMatching(/^20/),
            name: "Jame Butler",
            bio: REALLY_LONG_TEXT,
            prescription: [REALLY_LONG_TEXT, REALLY_LONG_TEXT],
            meta: {
                locked: false,
                publishedOn: null,
                revisions: [
                    {
                        id: expect.any(String),
                        name: "Jame Butler",
                        bio: REALLY_LONG_TEXT
                    }
                ],
                status: "draft",
                title: "Jame Butler",
                version: 1
            }
        });

        // If this `until` resolves successfully, we know entry is accessible via the "read" API
        await until(
            () =>
                getPatient({
                    where: {
                        id: patient.id
                    }
                }).then(([data]) => data),
            ({ data }) => data.getPatient.data.id === patient.id,
            { name: "get created patient", tries: 10 }
        );

        const [getPatientResponse] = await getPatient({
            where: {
                id: patient.id
            }
        });

        expect(getPatientResponse).toEqual({
            data: {
                getPatient: {
                    data: {
                        id: expect.any(String),
                        createdOn: expect.stringMatching(/^20/),
                        savedOn: expect.stringMatching(/^20/),
                        name: "Jame Butler",
                        bio: REALLY_LONG_TEXT,
                        prescription: [REALLY_LONG_TEXT, REALLY_LONG_TEXT]
                    },
                    error: null
                }
            }
        });

        const [listPatientsResponse] = await listPatients({});

        expect(listPatientsResponse).toEqual({
            data: {
                listPatients: {
                    data: [
                        {
                            id: expect.any(String),
                            createdOn: expect.stringMatching(/^20/),
                            savedOn: expect.stringMatching(/^20/),
                            name: "Jame Butler",
                            bio: REALLY_LONG_TEXT,
                            prescription: [REALLY_LONG_TEXT, REALLY_LONG_TEXT]
                        }
                    ],
                    meta: {
                        cursor: null,
                        hasMoreItems: false,
                        totalCount: 1
                    },
                    error: null
                }
            }
        });
    });

    test("should able to search long text field", async () => {
        const contentModelGroup = await setupContentModelGroup();
        await setupContentModel(contentModelGroup, "patient");
        const { getPatient, listPatients, until } = usePatientReadHandler({
            ...readOpts
        });

        const patient = await createPatient();

        // If this `until` resolves successfully, we know entry is accessible via the "read" API
        await until(
            () =>
                getPatient({
                    where: {
                        id: patient.id
                    }
                }).then(([data]) => data),
            ({ data }) => data.getPatient.data.id === patient.id,
            { name: "get created patient", tries: 10 }
        );

        const [getPatientResponse] = await getPatient({
            where: {
                id: patient.id
            }
        });

        expect(getPatientResponse).toEqual({
            data: {
                getPatient: {
                    data: {
                        id: expect.any(String),
                        createdOn: expect.stringMatching(/^20/),
                        savedOn: expect.stringMatching(/^20/),
                        name: "Jame Butler",
                        bio: REALLY_LONG_TEXT,
                        prescription: [REALLY_LONG_TEXT, REALLY_LONG_TEXT]
                    },
                    error: null
                }
            }
        });
        // Should return the entry
        let [listPatientsResponse] = await listPatients({ where: { bio_contains: "ipsum dolor" } });

        expect(listPatientsResponse).toEqual({
            data: {
                listPatients: {
                    data: [
                        {
                            id: expect.any(String),
                            createdOn: expect.stringMatching(/^20/),
                            savedOn: expect.stringMatching(/^20/),
                            name: "Jame Butler",
                            bio: REALLY_LONG_TEXT,
                            prescription: [REALLY_LONG_TEXT, REALLY_LONG_TEXT]
                        }
                    ],
                    meta: {
                        cursor: null,
                        hasMoreItems: false,
                        totalCount: 1
                    },
                    error: null
                }
            }
        });
        // Should return empty list when searching for non-existing text
        [listPatientsResponse] = await listPatients({ where: { bio_contains: "coffee" } });

        expect(listPatientsResponse).toEqual({
            data: {
                listPatients: {
                    data: [],
                    meta: {
                        cursor: null,
                        hasMoreItems: false,
                        totalCount: 0
                    },
                    error: null
                }
            }
        });
    });
});

import { SecurityIdentity } from "@webiny/api-security";
import useGqlHandler from "./useGqlHandler";

function Mock(prefix) {
    this.name = `${prefix}name`;
}

function MockResponse({ prefix, id }) {
    this.name = `${prefix}name`;
    this.id = id;
    this.createdOn = /^20/;
    this.savedOn = /^20/;
    this.publishedOn = null;
    this.parent = `${id.split("#")[0]}#1`;
    this.layout = null;
    this.locked = false;
    this.published = false;
    this.stats = {
        submissions: 0,
        views: 0
    };
    this.status = "draft";
    this.triggers = null;
    this.version = 1;
    this.layout = [];
}

const NOT_AUTHORIZED_RESPONSE = operation => ({
    data: {
        formBuilder: {
            [operation]: {
                data: null,
                error: {
                    code: "SECURITY_NOT_AUTHORIZED",
                    data: null,
                    message: "Not authorized!"
                }
            }
        }
    }
});

const identityA = new SecurityIdentity({
    id: "a",
    login: "a",
    type: "test",
    displayName: "Aa"
});

const identityB = new SecurityIdentity({
    id: "b",
    login: "b",
    type: "test",
    displayName: "Bb"
});

const defaultHandler = useGqlHandler({
    permissions: [{ name: "content.i18n" }, { name: "fb.*" }],
    identity: identityA
});

beforeEach(async () => {
    try {
        await defaultHandler.elasticSearch.indices.create({ index: "form-builder" });
    } catch (e) {}
});

afterEach(async () => {
    try {
        await defaultHandler.elasticSearch.indices.delete({ index: "form-builder" });
    } catch (e) {}
});

describe("Forms Security Test", () => {
    test(`"listForms" only returns entries to which the identity has access to`, async () => {
        const { createForm, sleep } = defaultHandler;
        let [createFormResponse] = await createForm({
            data: new Mock("list-forms-1-")
        });

        const form1Id = createFormResponse.data.formBuilder.createForm.data.id;
        
        [createFormResponse] = await createForm({
            data: new Mock("list-forms-2-")
        });
        const form2Id = createFormResponse.data.formBuilder.createForm.data.id;

        const identityBHandler = useGqlHandler({ identity: identityB });
        let [identityBHandlerCreateFormResponse] = await identityBHandler.createForm({
            data: new Mock("list-forms-3-")
        });
        const form3Id = identityBHandlerCreateFormResponse.data.formBuilder.createForm.data.id;

        [identityBHandlerCreateFormResponse] = await identityBHandler.createForm({
            data: new Mock("list-forms-4-")
        });
        const form4Id = identityBHandlerCreateFormResponse.data.formBuilder.createForm.data.id;

        const insufficientPermissions = [
            [[], null],
            [[], identityA],
            [[{ name: "fb.form", rwd: "wd" }], identityA],
            [[{ name: "fb.form", rwd: "d" }], identityA],
            [[{ name: "fb.form", rwd: "w" }], identityA]
        ];

        for (let i = 0; i < insufficientPermissions.length; i++) {
            let [permissions, identity] = insufficientPermissions[i];
            const { listForms } = useGqlHandler({ permissions, identity });
            let [response] = await listForms();
            expect(response).toEqual(NOT_AUTHORIZED_RESPONSE("listForms"));
        }

        const sufficientPermissionsAll = [
            [[{ name: "content.i18n" }, { name: "fb.form" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "r" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rw" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rwd" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.*" }], identityA]
        ];

        for (let i = 0; i < sufficientPermissionsAll.length; i++) {
            let [permissions, identity] = sufficientPermissionsAll[i];
            const { listForms } = useGqlHandler({ permissions, identity });

            // List should not be empty.
            // Wait for the "Elasticsearch" to finish indexing.
            while (true) {
                await sleep();
                const [response] = await listForms();
                if (response.data.formBuilder.listForms.data.length) {
                    break;
                }
            }

            let [response] = await listForms({ sort: { createdOn: 1 } });
            expect(response).toMatchObject({
                data: {
                    formBuilder: {
                        listForms: {
                            data: [
                                new MockResponse({ prefix: "list-forms-1-", id: form1Id }),
                                new MockResponse({ prefix: "list-forms-2-", id: form2Id }),
                                new MockResponse({ prefix: "list-forms-3-", id: form3Id }),
                                new MockResponse({ prefix: "list-forms-4-", id: form4Id })
                            ],
                            error: null
                        }
                    }
                }
            });
        }

        let identityAHandler = useGqlHandler({
            permissions: [{ name: "content.i18n" }, { name: "fb.form", own: true }],
            identity: identityA
        });

        let [response] = await identityAHandler.listForms();
        expect(response).toMatchObject({
            data: {
                formBuilder: {
                    listForms: {
                        data: [
                            new MockResponse({ prefix: "list-forms-2-", id: form2Id }),
                            new MockResponse({ prefix: "list-forms-1-", id: form1Id })
                        ],
                        error: null
                    }
                }
            }
        });

        identityAHandler = useGqlHandler({
            permissions: [{ name: "content.i18n" }, { name: "fb.form", own: true }],
            identity: identityB
        });

        [response] = await identityAHandler.listForms();
        expect(response).toMatchObject({
            data: {
                formBuilder: {
                    listForms: {
                        data: [
                            new MockResponse({ prefix: "list-forms-4-", id: form4Id }),
                            new MockResponse({ prefix: "list-forms-3-", id: form3Id })
                        ],
                        error: null
                    }
                }
            }
        });
    });

    test(`allow "createForm" if identity has sufficient permissions`, async () => {
        const insufficientPermissions = [
            [[], null],
            [[], identityA],
            [[{ name: "fb.form", own: false, rwd: "r" }], identityA],
            [[{ name: "fb.form", own: false, rwd: "rd" }], identityA]
        ];

        for (let i = 0; i < insufficientPermissions.length; i++) {
            let [permissions, identity] = insufficientPermissions[i];
            const { createForm } = useGqlHandler({ permissions, identity });

            let [response] = await createForm({ data: new Mock() });
            expect(response).toEqual(NOT_AUTHORIZED_RESPONSE("createForm"));
        }

        const sufficientPermissions = [
            [[{ name: "content.i18n" }, { name: "fb.form" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", own: true }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "w" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rw" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rwd" }], identityA]
        ];

        for (let i = 0; i < sufficientPermissions.length; i++) {
            let [permissions, identity] = sufficientPermissions[i];
            const { createForm } = useGqlHandler({ permissions, identity });

            const data = new Mock(`form-create-${i}-`);
            let [response] = await createForm({ data });
            expect(response).toMatchObject({
                data: {
                    formBuilder: {
                        createForm: {
                            data: {
                                ...new MockResponse({
                                    prefix: `form-create-${i}-`,
                                    id: response.data.formBuilder.createForm.data.id
                                })
                            },
                            error: null
                        }
                    }
                }
            });
        }
    });

    test(`allow "updateForm" if identity has sufficient permissions`, async () => {
        const { createForm } = defaultHandler;
        const mock = new Mock("update-form-");

        const [createFormResponse] = await createForm({ data: mock });
        const formId = createFormResponse.data.formBuilder.createForm.data.id;

        let insufficientPermissions = [
            [[], null],
            [[], identityA],
            [[{ name: "fb.form", rwd: "r" }], identityA],
            [[{ name: "fb.form", rwd: "rd" }], identityA],
            [[{ name: "fb.form", own: true }], identityB]
        ];

        for (let i = 0; i < insufficientPermissions.length; i++) {
            let [permissions, identity] = insufficientPermissions[i];
            const { updateRevision } = useGqlHandler({ permissions, identity });
            const mock = new Mock(`new-updated-form-`);
            let [response] = await updateRevision({ id: formId, data: mock });
            expect(response).toEqual(NOT_AUTHORIZED_RESPONSE("updateRevision"));
        }

        let sufficientPermissions = [
            [[{ name: "content.i18n" }, { name: "fb.form" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", own: true }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "w" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rw" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rwd" }], identityA]
        ];

        for (let i = 0; i < sufficientPermissions.length; i++) {
            let [permissions, identity] = sufficientPermissions[i];
            const { updateRevision } = useGqlHandler({ permissions, identity });
            const mock = new Mock(`new-updated-form-`);
            let [response] = await updateRevision({ id: formId, data: mock });
            expect(response).toMatchObject({
                data: {
                    formBuilder: {
                        updateRevision: {
                            data: {
                                ...new MockResponse({ prefix: `new-updated-form-`, id: formId }),
                                layout: []
                            },
                            error: null
                        }
                    }
                }
            });
        }
    });

    test(`allow "getForm" if identity has sufficient permissions`, async () => {
        const { createForm } = defaultHandler;
        const mock = new Mock("get-form-");

        const [createFormResponse] = await createForm({ data: mock });
        const formId = createFormResponse.data.formBuilder.createForm.data.id;

        let insufficientPermissions = [
            [[], null],
            [[], identityA],
            [[{ name: "fb.form", rwd: "w" }], identityA],
            [[{ name: "fb.form", rwd: "wd" }], identityA],
            [[{ name: "fb.form", own: true }], identityB]
        ];

        for (let i = 0; i < insufficientPermissions.length; i++) {
            let [permissions, identity] = insufficientPermissions[i];
            const { getForm } = useGqlHandler({ permissions, identity });
            let [response] = await getForm({ id: formId });
            expect(response).toEqual(NOT_AUTHORIZED_RESPONSE("getForm"));
        }

        let sufficientPermissions = [
            [[{ name: "content.i18n" }, { name: "fb.form" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", own: true }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "r" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rw" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rwd" }], identityA]
        ];

        for (let i = 0; i < sufficientPermissions.length; i++) {
            let [permissions, identity] = sufficientPermissions[i];
            const { getForm } = useGqlHandler({ permissions, identity });
            let [response] = await getForm({ id: formId });
            expect(response).toMatchObject({
                data: {
                    formBuilder: {
                        getForm: {
                            data: new MockResponse({ prefix: `get-form-`, id: formId }),
                            error: null
                        }
                    }
                }
            });
        }
    });

    test(`allow "deleteForm" if identity has sufficient permissions`, async () => {
        const { createForm } = defaultHandler;
        const mock = new Mock("delete-form-");

        let [createFormResponse] = await createForm({ data: mock });
        let formId = createFormResponse.data.formBuilder.createForm.data.id;

        let insufficientPermissions = [
            [[], null],
            [[], identityA],
            [[{ name: "fb.form", rwd: "w" }], identityA],
            [[{ name: "fb.form", rwd: "rw" }], identityA],
            [[{ name: "fb.form", own: true }], identityB]
        ];

        for (let i = 0; i < insufficientPermissions.length; i++) {
            let [permissions, identity] = insufficientPermissions[i];
            const { deleteForm } = useGqlHandler({ permissions, identity });
            let [response] = await deleteForm({ id: formId });
            expect(response).toEqual(NOT_AUTHORIZED_RESPONSE("deleteForm"));
        }

        let sufficientPermissions = [
            [[{ name: "content.i18n" }, { name: "fb.form" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", own: true }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rwd" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rwdp" }], identityA]
        ];

        for (let i = 0; i < sufficientPermissions.length; i++) {
            let [permissions, identity] = sufficientPermissions[i];
            const { deleteForm } = useGqlHandler({ permissions, identity });
            let [response] = await deleteForm({ id: formId });
            expect(response).toMatchObject({
                data: {
                    formBuilder: {
                        deleteForm: {
                            data: true,
                            error: null
                        }
                    }
                }
            });

            // Let's restore the form.
            [createFormResponse] = await createForm({ data: mock });
            formId = createFormResponse.data.formBuilder.createForm.data.id;
        }
    });

    test(`allow "publishForm" if identity has sufficient permissions`, async () => {
        const { createForm } = defaultHandler;
        const mock = new Mock("publishRevision-form-");

        let [createFormResponse] = await createForm({ data: mock });
        let formId = createFormResponse.data.formBuilder.createForm.data.id;

        let insufficientPermissions = [
            [[], null],
            [[], identityA],
            [[{ name: "fb.form", rwd: "w" }], identityA],
            [[{ name: "fb.form", rwd: "rw" }], identityA],
            [[{ name: "fb.form", own: true }], identityB]
        ];

        for (let i = 0; i < insufficientPermissions.length; i++) {
            let [permissions, identity] = insufficientPermissions[i];
            const { publishRevision } = useGqlHandler({ permissions, identity });
            let [response] = await publishRevision({ id: formId });
            expect(response).toEqual(NOT_AUTHORIZED_RESPONSE("publishRevision"));
        }

        let sufficientPermissions = [
            [[{ name: "content.i18n" }, { name: "fb.form" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", own: true }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rwdp" }], identityA]
        ];

        for (let i = 0; i < sufficientPermissions.length; i++) {
            let [permissions, identity] = sufficientPermissions[i];
            const { publishRevision, unpublishRevision } = useGqlHandler({ permissions, identity });
            let [response] = await publishRevision({ id: formId });
            expect(response).toMatchObject({
                data: {
                    formBuilder: {
                        publishRevision: {
                            data: {
                                ...new MockResponse({
                                    prefix: `publishRevision-form-`,
                                    id: formId
                                }),
                                publishedOn: /^20/,
                                published: true,
                                status: "published",
                                locked: true
                            },
                            error: null
                        }
                    }
                }
            });

            // Let's restore the form.
            const [unPublishFormRevision] = await unpublishRevision({ id: formId });
            formId = unPublishFormRevision.data.formBuilder.unpublishRevision.data.id;
        }
    });

    test(`allow "createRevisionFrom" if identity has sufficient permissions`, async () => {
        const { sleep, createForm, publishRevision, listPublishedForms } = defaultHandler;
        const mock = new Mock("create-revision-form-");

        const [createFormResponse] = await createForm({ data: mock });
        let formId = createFormResponse.data.formBuilder.createForm.data.id;
        // Let's also publish the form.
        const [publishRevisionResponse] = await publishRevision({ id: formId });
        expect(publishRevisionResponse).toMatchObject({
            data: {
                formBuilder: {
                    publishRevision: {
                        data: {
                            ...new MockResponse({
                                prefix: "create-revision-form-",
                                id: formId
                            }),
                            publishedOn: /^20/,
                            published: true,
                            status: "published",
                            locked: true
                        },
                        error: null
                    }
                }
            }
        });

        // List should not be empty.
        // Wait for the "Elasticsearch" to finish indexing.
        while (true) {
            await sleep();
            const [response] = await listPublishedForms();
            if (response.data.formBuilder.listPublishedForms.data.length) {
                break;
            }
        }

        let insufficientPermissions = [
            [[], null],
            [[], identityA],
            [[{ name: "fb.form", own: false, rwd: "r" }], identityA],
            [[{ name: "fb.form", own: false, rwd: "rd" }], identityA]
        ];

        for (let i = 0; i < insufficientPermissions.length; i++) {
            let [permissions, identity] = insufficientPermissions[i];
            const { createRevisionFrom } = useGqlHandler({ permissions, identity });
            let [response] = await createRevisionFrom({ revision: formId });
            expect(response).toEqual(NOT_AUTHORIZED_RESPONSE("createRevisionFrom"));
        }

        let sufficientPermissions = [
            [[{ name: "content.i18n" }, { name: "fb.form" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", own: true }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "w" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rw" }], identityA],
            [[{ name: "content.i18n" }, { name: "fb.form", rwd: "rwd" }], identityA]
        ];

        for (let i = 0; i < sufficientPermissions.length; i++) {
            let [permissions, identity] = sufficientPermissions[i];
            const { createRevisionFrom } = useGqlHandler({ permissions, identity });
            let [response] = await createRevisionFrom({ revision: formId });

            formId = response.data.formBuilder.createRevisionFrom.data.id;

            expect(response).toMatchObject({
                data: {
                    formBuilder: {
                        createRevisionFrom: {
                            data: {
                                ...new MockResponse({
                                    prefix: "create-revision-form-",
                                    id: formId
                                }),
                                status: "draft",
                                version: i + 2
                            },
                            error: null
                        }
                    }
                }
            });

            // Let's also publish this form.
            const [publishRevisionResponse] = await publishRevision({ id: formId });
            expect(publishRevisionResponse).toMatchObject({
                data: {
                    formBuilder: {
                        publishRevision: {
                            data: {
                                ...new MockResponse({
                                    prefix: "create-revision-form-",
                                    id: formId
                                }),
                                publishedOn: /^20/,
                                published: true,
                                status: "published",
                                locked: true,
                                version: i + 2
                            },
                            error: null
                        }
                    }
                }
            });
        }
    });
});

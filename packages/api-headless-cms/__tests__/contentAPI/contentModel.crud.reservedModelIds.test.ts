import { CmsContentModelGroup } from "../../src/types";
import { useContentGqlHandler } from "../utils/useContentGqlHandler";
import { hooksTracker } from "./mocks/lifecycleHooks";

describe("content model test", () => {
    const manageHandlerOpts = { path: "manage/en-US" };

    const { clearAllIndex, createContentModelGroupMutation } = useContentGqlHandler(
        manageHandlerOpts
    );

    let contentModelGroup: CmsContentModelGroup;

    beforeEach(async () => {
        const [createCMG] = await createContentModelGroupMutation({
            data: {
                name: "Group",
                slug: "group",
                icon: "ico/ico",
                description: "description"
            }
        });
        contentModelGroup = createCMG.data.createContentModelGroup.data;
        try {
            await clearAllIndex();
        } catch {
            // Ignore errors
        }
        // we need to reset this since we are using a singleton
        hooksTracker.reset();
    });

    afterEach(async () => {
        try {
            await clearAllIndex();
        } catch {}
    });

    test(`should not allow creation of a model the modelId set to blacklisted value`, async () => {
        const { createContentModelMutation } = useContentGqlHandler(manageHandlerOpts);

        await createContentModelMutation({
            data: {
                name: "Content Model",
                modelId: "contentModel",
                group: contentModelGroup.id
            }
        }).then(([response]) => {
            expect(response).toEqual({
                data: {
                    createContentModel: {
                        data: null,
                        error: {
                            code: "",
                            data: null,
                            message: 'Provided model ID "contentModel" is not allowed.'
                        }
                    }
                }
            });
        });

        await createContentModelMutation({
            data: {
                name: "Content Model Group",
                modelId: "contentModelGroup",
                group: contentModelGroup.id
            }
        }).then(([response]) => {
            expect(response).toEqual({
                data: {
                    createContentModel: {
                        data: null,
                        error: {
                            code: "",
                            data: null,
                            message: 'Provided model ID "contentModelGroup" is not allowed.'
                        }
                    }
                }
            });
        });
    });
});

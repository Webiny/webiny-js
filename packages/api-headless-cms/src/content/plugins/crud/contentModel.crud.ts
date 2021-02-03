import { ContextPlugin } from "@webiny/handler/types";
import {
    CmsContext,
    CmsContentModel,
    CmsContentModelContext,
    CmsContentModelManager,
    CmsContentModelPermission
} from "@webiny/api-headless-cms/types";
import * as utils from "@webiny/api-headless-cms/utils";
import DataLoader from "dataloader";
import { NotFoundError } from "@webiny/handler-graphql";
import { contentModelManagerFactory } from "./contentModel/contentModelManagerFactory";
import { CreateContentModelModel, UpdateContentModelModel } from "./contentModel/models";
import { createFieldModels } from "./contentModel/createFieldModels";
import { validateLayout } from "./contentModel/validateLayout";
import {
    beforeCreateHook,
    afterCreateHook,
    beforeUpdateHook,
    afterUpdateHook,
    beforeDeleteHook,
    afterDeleteHook
} from "./contentModel/hooks";

export default (): ContextPlugin<CmsContext> => ({
    type: "context",
    name: "context-content-model-crud",
    async apply(context) {
        const { db } = context;

        const PK_CONTENT_MODEL = () => `${utils.createCmsPK(context)}#CM`;

        const loaders = {
            listModels: new DataLoader(async () => {
                const [models] = await db.read<CmsContentModel>({
                    ...utils.defaults.db,
                    query: { PK: PK_CONTENT_MODEL(), SK: { $gt: " " } }
                });

                return [models];
            })
        };

        const managers = new Map<string, CmsContentModelManager>();
        const updateManager = async (
            context: CmsContext,
            model: CmsContentModel
        ): Promise<CmsContentModelManager> => {
            const manager = await contentModelManagerFactory(context, model);
            managers.set(model.modelId, manager);
            return manager;
        };

        const checkPermissions = (check: string): Promise<CmsContentModelPermission> => {
            return utils.checkPermissions(context, "cms.contentModel", { rwd: check });
        };

        const modelsGet = async (modelId: string) => {
            const [[model]] = await db.read<CmsContentModel>({
                ...utils.defaults.db,
                query: { PK: PK_CONTENT_MODEL(), SK: modelId }
            });

            if (!model) {
                throw new NotFoundError(`Content model "${modelId}" was not found!`);
            }

            return model;
        };

        const modelsList = async () => {
            return await loaders.listModels.load("listModels");
        };

        const models: CmsContentModelContext = {
            noAuth: () => {
                return {
                    get: modelsGet,
                    list: modelsList
                };
            },
            async get(modelId) {
                const permission = await checkPermissions("r");

                const model = await modelsGet(modelId);

                utils.checkOwnership(context, permission, model);
                utils.checkModelAccess(context, permission, model);

                return model;
            },
            async list() {
                const permission = await checkPermissions("r");
                const models = await modelsList();
                return models.filter(model => {
                    if (!utils.validateOwnership(context, permission, model)) {
                        return false;
                    }
                    return utils.validateModelAccess(context, permission, model);
                });
            },
            async create(data) {
                await checkPermissions("w");

                const createdData = new CreateContentModelModel().populate(data);
                await createdData.validate();
                const createdDataJson = await createdData.toJSON();

                const group = await context.cms.groups.noAuth().get(createdDataJson.group);
                if (!group) {
                    throw new NotFoundError(`There is no group "${createdDataJson.group}".`);
                }

                const identity = context.security.getIdentity();
                const model: CmsContentModel = {
                    ...createdDataJson,
                    titleFieldId: "id",
                    group: {
                        id: group.id,
                        name: group.name
                    },
                    createdBy: {
                        id: identity.id,
                        displayName: identity.displayName,
                        type: identity.type
                    },
                    createdOn: new Date().toISOString(),
                    savedOn: new Date().toISOString(),
                    fields: [],
                    lockedFields: [],
                    layout: []
                };

                await beforeCreateHook({ context, model });

                await db.create({
                    ...utils.defaults.db,
                    data: {
                        PK: PK_CONTENT_MODEL(),
                        SK: model.modelId,
                        TYPE: "cms.model",
                        ...model
                    }
                });

                await updateManager(context, model);

                await afterCreateHook({ context, model });

                return model;
            },
            /**
             * @internal
             */
            async updateModel(model, data: Partial<CmsContentModel>) {
                await beforeUpdateHook({ context, model, data });
                await db.update({
                    ...utils.defaults.db,
                    query: {
                        PK: PK_CONTENT_MODEL(),
                        SK: model.modelId
                    },
                    data
                });

                const combinedModel: CmsContentModel = {
                    ...model,
                    ...data
                };

                await afterUpdateHook({ context, model: combinedModel });

                await updateManager(context, combinedModel);
            },
            async update(modelId, data) {
                await checkPermissions("w");

                // Get a model record; this will also perform ownership validation.
                const model = await context.cms.models.get(modelId);

                const updatedData = new UpdateContentModelModel().populate(data);
                await updatedData.validate();

                const updatedDataJson = await updatedData.toJSON({ onlyDirty: true });
                if (Object.keys(updatedDataJson).length === 0) {
                    return {} as any;
                }
                if (updatedDataJson.group) {
                    const group = await context.cms.groups.noAuth().get(updatedDataJson.group);
                    if (!group) {
                        throw new NotFoundError(`There is no group "${updatedDataJson.group}".`);
                    }
                    updatedDataJson.group = {
                        id: group.id,
                        name: group.name
                    };
                }
                const modelFields = await createFieldModels(model, data);
                validateLayout(updatedDataJson, modelFields);
                const modelData: Partial<CmsContentModel> = {
                    ...updatedDataJson,
                    fields: modelFields,
                    savedOn: new Date().toISOString()
                };

                await beforeUpdateHook({ context, model, data: modelData });

                await db.update({
                    ...utils.defaults.db,
                    query: { PK: PK_CONTENT_MODEL(), SK: modelId },
                    data: modelData
                });

                const fullModel: CmsContentModel = {
                    ...model,
                    ...modelData
                };

                await updateManager(context, fullModel);

                await afterUpdateHook({ context, model: fullModel });

                return fullModel;
            },
            async delete(modelId) {
                await checkPermissions("d");

                const model = await context.cms.models.get(modelId);

                await beforeDeleteHook({ context, model });

                await db.delete({
                    ...utils.defaults.db,
                    query: {
                        PK: PK_CONTENT_MODEL(),
                        SK: modelId
                    }
                });

                await afterDeleteHook({ context, model });

                managers.delete(model.modelId);
            },
            async getManager(modelId) {
                if (managers.has(modelId)) {
                    return managers.get(modelId);
                }
                const models = await modelsList();
                const model = models.find(m => m.modelId === modelId);
                if (!model) {
                    throw new NotFoundError(`There is no content model "${modelId}".`);
                }
                return await updateManager(context, model);
            },
            getManagers: () => managers
        };

        context.cms = {
            ...(context.cms || ({} as any)),
            models,
            getModel: (modelId: string) => {
                return models.getManager(modelId);
            }
        };
    }
});

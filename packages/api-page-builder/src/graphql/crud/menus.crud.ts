import { ContextPlugin } from "@webiny/handler/types";
import defaults from "./utils/defaults";
import getPKPrefix from "./utils/getPKPrefix";
import { MenuHookPlugin, PbContext } from "../types";
import { Menu } from "../../types";
import { NotFoundError } from "@webiny/handler-graphql";
import checkBasePermissions from "./utils/checkBasePermissions";
import checkOwnPermissions from "./utils/checkOwnPermissions";
import Error from "@webiny/error";
import { validation } from "@webiny/validation";
import { withFields, string } from "@commodo/fields";
import { object } from "commodo-fields-object";
import executeHookCallbacks from "./utils/executeHookCallbacks";
import prepareMenuItems from "./menus/prepareMenuItems";

const CreateDataModel = withFields({
    title: string({ validation: validation.create("required,minLength:1,maxLength:100") }),
    slug: string({ validation: validation.create("required,minLength:1,maxLength:100") }),
    description: string({ validation: validation.create("maxLength:100") }),
    items: object()
})();

const UpdateDataModel = withFields({
    title: string({ validation: validation.create("minLength:1,maxLength:100") }),
    description: string({ validation: validation.create("maxLength:100") }),
    items: object()
})();

const TYPE = "pb.menu";
const PERMISSION_NAME = TYPE;

const plugin: ContextPlugin<PbContext> = {
    type: "context",
    async apply(context) {
        const { db } = context;
        const PK = () => `${getPKPrefix(context)}M`;

        const hookPlugins = context.plugins.byType<MenuHookPlugin>("pb-menu-hook");

        context.pageBuilder = {
            ...context.pageBuilder,
            menus: {
                async get(slug) {
                    const permission = await checkBasePermissions(context, PERMISSION_NAME, {
                        rwd: "r"
                    });

                    const [[menu]] = await db.read<Menu>({
                        ...defaults.db,
                        query: { PK: PK(), SK: slug },
                        limit: 1
                    });

                    if (!menu) {
                        return null;
                    }

                    const identity = context.security.getIdentity();
                    checkOwnPermissions(identity, permission, menu);

                    return menu;
                },

                /**
                 * Used to fetch menu data from a public website. Items are prepared for consumption too.
                 * @param slug
                 */
                async getPublic(slug) {
                    const [[menu]] = await db.read<Menu>({
                        ...defaults.db,
                        query: { PK: PK(), SK: slug }
                    });

                    if (!menu) {
                        throw new NotFoundError();
                    }

                    menu.items = await prepareMenuItems({ menu, context });
                    return menu;
                },

                async list() {
                    const permission = await checkBasePermissions(context, PERMISSION_NAME, {
                        rwd: "r"
                    });

                    const [menus] = await db.read<Menu>({
                        ...defaults.db,
                        query: { PK: PK(), SK: { $gt: " " } }
                    });

                    // If user can only manage own records, let's check if he owns the loaded one.
                    if (permission.own) {
                        const identity = context.security.getIdentity();
                        return menus.filter(item => item.createdBy.id === identity.id);
                    }

                    return menus;
                },

                async create(data) {
                    await checkBasePermissions(context, PERMISSION_NAME, { rwd: "w" });

                    const createDataModel = new CreateDataModel().populate(data);
                    await createDataModel.validate();

                    const identity = context.security.getIdentity();
                    const createData = Object.assign(await createDataModel.toJSON(), {
                        createdOn: new Date().toISOString(),
                        createdBy: {
                            id: identity.id,
                            type: identity.type,
                            displayName: identity.displayName
                        }
                    });

                    const [[menuWithSameSlug]] = await db.read<Menu>({
                        ...defaults.db,
                        query: { PK: PK(), SK: createData.slug },
                        limit: 1
                    });

                    if (menuWithSameSlug) {
                        throw new Error(`Menu "${createData.slug}" already exists.`);
                    }

                    await executeHookCallbacks(hookPlugins, "beforeCreate", context, createData);

                    await db.create({
                        ...defaults.db,
                        data: {
                            ...createData,
                            PK: PK(),
                            SK: createDataModel.slug,
                            TYPE,
                            tenant: context.security.getTenant().id,
                            locale: context.i18nContent.getLocale().code
                        }
                    });

                    await executeHookCallbacks(hookPlugins, "afterCreate", context, createData);

                    return createData;
                },

                async update(slug, data) {
                    const permission = await checkBasePermissions(context, PERMISSION_NAME, {
                        rwd: "w"
                    });

                    const menu = await this.get(slug);
                    if (!menu) {
                        throw new NotFoundError(`Menu "${slug}" not found.`);
                    }

                    const identity = context.security.getIdentity();
                    checkOwnPermissions(identity, permission, menu);

                    const updateDataModel = new UpdateDataModel().populate(data);
                    await updateDataModel.validate();

                    const updateData = await updateDataModel.toJSON({ onlyDirty: true });

                    await executeHookCallbacks(hookPlugins, "beforeUpdate", context, menu);

                    await db.update({
                        ...defaults.db,
                        query: { PK: PK(), SK: slug },
                        data: updateData
                    });

                    await executeHookCallbacks(hookPlugins, "afterUpdate", context, menu);

                    return { ...menu, ...updateData };
                },
                async delete(slug) {
                    const permission = await checkBasePermissions(context, PERMISSION_NAME, {
                        rwd: "d"
                    });

                    const menu = await this.get(slug);
                    if (!menu) {
                        throw new NotFoundError(`Menu "${slug}" not found.`);
                    }

                    const identity = context.security.getIdentity();
                    checkOwnPermissions(identity, permission, menu);

                    await executeHookCallbacks(hookPlugins, "beforeDelete", context, menu);

                    await db.delete({
                        ...defaults.db,
                        query: { PK: PK(), SK: slug }
                    });

                    await executeHookCallbacks(hookPlugins, "beforeDelete", context, menu);

                    return menu;
                }
            }
        };
    }
};

export default plugin;

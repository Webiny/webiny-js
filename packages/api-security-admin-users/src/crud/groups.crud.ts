import { object } from "commodo-fields-object";
import { withFields, string } from "@commodo/fields";
import { validation } from "@webiny/validation";
import { AdminUsersContext, Group } from "~/types";
import WebinyError from "@webiny/error";
import { ContextPlugin } from "@webiny/handler/plugins/ContextPlugin";
import { GroupsStorageOperationsProvider } from "~/plugins/GroupsStorageOperationsProvider";
import { NotFoundError } from "@webiny/handler-graphql";
import { NotAuthorizedError } from "@webiny/api-security";
import deepEqual from "deep-equal";

const CreateDataModel = withFields({
    tenant: string({ validation: validation.create("required") }),
    name: string({ validation: validation.create("required,minLength:3") }),
    slug: string({ validation: validation.create("required,minLength:3") }),
    description: string({ validation: validation.create("maxLength:500") }),
    permissions: object({
        list: true,
        validation: validation.create("required")
    })
})();

const UpdateDataModel = withFields({
    name: string({ validation: validation.create("minLength:3") }),
    description: string({ validation: validation.create("maxLength:500") }),
    permissions: object({ list: true })
})();

export default new ContextPlugin<AdminUsersContext>(async context => {
    const pluginType = GroupsStorageOperationsProvider.type;

    const providerPlugin = context.plugins
        .byType<GroupsStorageOperationsProvider>(pluginType)
        .find(() => true);

    if (!providerPlugin) {
        throw new WebinyError(`Missing "${pluginType}" plugin.`, "PLUGIN_NOT_FOUND", {
            type: pluginType
        });
    }

    const storageOperations = await providerPlugin.provide({
        context
    });

    context.security.groups = {
        async getGroup(slug) {
            const permission = await context.security.getPermission("security.group");

            if (!permission) {
                throw new NotAuthorizedError();
            }
            const tenant = context.tenancy.getCurrentTenant();

            let group: Group = null;
            try {
                group = await storageOperations.get(tenant, {
                    slug
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not get group.",
                    ex.code || "GET_GROUP_ERROR",
                    {
                        slug
                    }
                );
            }
            if (!group) {
                throw new NotFoundError(`Unable to find group with slug: ${slug}`);
            }
            return group;
        },
        async listGroups() {
            const permission = await context.security.getPermission("security.group");

            if (!permission) {
                throw new NotAuthorizedError();
            }
            const tenant = context.tenancy.getCurrentTenant();
            try {
                return await storageOperations.list(tenant, {
                    sort: ["createdOn_ASC"]
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not list API keys.",
                    ex.code || "LIST_API_KEY_ERROR"
                );
            }
        },
        async createGroup(input) {
            const permission = await context.security.getPermission("security.group");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            const identity = context.security.getIdentity();

            const tenant = context.tenancy.getCurrentTenant();

            await new CreateDataModel().populate({ ...input, tenant: tenant.id }).validate();

            const existing = await storageOperations.get(tenant, {
                slug: input.slug
            });
            if (existing) {
                throw new WebinyError(
                    `Group with slug "${input.slug}" already exists.`,
                    "GROUP_EXISTS"
                );
            }

            const group: Group = {
                tenant: tenant.id,
                system: false,
                ...input,
                createdOn: new Date().toISOString(),
                createdBy: identity
                    ? {
                          id: identity.id,
                          displayName: identity.displayName,
                          type: identity.type
                      }
                    : null
            };

            try {
                return await storageOperations.create(tenant, {
                    group
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not create group.",
                    ex.code || "CREATE_GROUP_ERROR",
                    {
                        group
                    }
                );
            }
        },
        async updateGroup(slug, input) {
            const permission = await context.security.getPermission("security.group");

            if (!permission) {
                throw new NotAuthorizedError();
            }
            const tenant = context.tenancy.getCurrentTenant();

            const model = await new UpdateDataModel().populate(input);
            await model.validate();

            const original = await storageOperations.get(tenant, {
                slug
            });
            if (!original) {
                throw new NotFoundError(`Group "${slug}" was not found!`);
            }

            const data = await model.toJSON({ onlyDirty: true });

            const permissionsChanged = !deepEqual(data.permissions, original.permissions);

            const group: Group = {
                ...original,
                ...data
            };
            try {
                const result = await storageOperations.update(tenant, {
                    original,
                    group
                });
                if (permissionsChanged) {
                    await storageOperations.updateUserLinks(tenant, {
                        group: result
                    });
                }
                return result;
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not update group.",
                    ex.code || "UPDATE_GROUP_ERROR",
                    {
                        group
                    }
                );
            }
        },
        async deleteGroup(slug) {
            const permission = await context.security.getPermission("security.group");

            if (!permission) {
                throw new NotAuthorizedError();
            }
            const tenant = context.tenancy.getCurrentTenant();

            const group = await storageOperations.get(tenant, {
                slug
            });
            if (!group) {
                throw new NotFoundError(`Group "${slug}" was not found!`);
            }
            try {
                await storageOperations.delete(tenant, {
                    group
                });
                return true;
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not create group.",
                    ex.code || "CREATE_GROUP_ERROR",
                    {
                        group
                    }
                );
            }
        }
    };
});

import mdbid from "mdbid";
import cloneDeep from "lodash.clonedeep";
import { withFields, string } from "@commodo/fields";
import { validation } from "@webiny/validation";
import { Tenant } from "@webiny/api-tenancy/types";
import { NotAuthorizedError } from "@webiny/api-security";
import { NotFoundError } from "@webiny/handler-graphql";
import WebinyError from "@webiny/error";
import { UserPlugin } from "~/plugins/UserPlugin";
import {
    AdminUsersContext,
    CreatePersonalAccessTokenInput,
    CreateUserInput,
    Group,
    TenantAccess,
    UpdatePersonalAccessTokenInput,
    UpdateUserInput,
    User,
    UserPersonalAccessToken
} from "~/types";

import dbArgs from "./dbArgs";
import { UserLoaders } from "./users.loaders";
import validationPlugin from "./users.validation";
import { UserStorageOperationsProvider } from "~/plugins/UserStorageOperationsProvider";
import { ContextPlugin } from "@webiny/handler/plugins/ContextPlugin";
import { SecurityIdentity } from "@webiny/api-security/types";

const CreateAccessTokenDataModel = withFields({
    name: string({ validation: validation.create("required,maxLength:100") }),
    token: string({ validation: validation.create("required,maxLength:64") })
})();

const UpdateAccessTokenDataModel = withFields({
    name: string({ validation: validation.create("required") })
})();

const executeCallback = async <TCallbackFunction extends (params: any) => void | Promise<void>>(
    plugins: UserPlugin[],
    callback: string,
    params: Parameters<TCallbackFunction>[0]
) => {
    for (const plugin of plugins) {
        if (typeof plugin[callback] === "function") {
            await plugin[callback](params);
        }
    }
};

export default new ContextPlugin<AdminUsersContext>(async context => {
    const providers = context.plugins.byType<UserStorageOperationsProvider>(
        UserStorageOperationsProvider.type
    );
    /**
     * Always take the last given provider - although if everything is loaded as it must, there should not be more than one.
     * We do not check/verify for multiple providers.
     */
    const provider = providers.pop();
    if (!provider) {
        throw new WebinyError(
            "Could not find a UserStorageOperationsProvider plugin registered.",
            "PROVIDER_PLUGIN_ERROR",
            {
                type: UserStorageOperationsProvider.type
            }
        );
    }

    const storageOperations = await provider.provide({
        context
    });

    const userPlugins = context.plugins.byType<UserPlugin>(UserPlugin.type);
    /**
     * Validation plugin for creating/updating the user.
     */
    context.plugins.register(validationPlugin);
    /**
     * We need the data loaders to cache what ever we can.
     */
    const loaders = new UserLoaders({ context, storageOperations });

    context.security.users = {
        async login(): Promise<User> {
            const { security } = context;
            const identity = security.getIdentity();

            if (!identity) {
                throw new NotAuthorizedError();
            }

            let user = await context.security.users.getUser(identity.id, { auth: false });

            let firstLogin = false;

            if (!user) {
                firstLogin = true;
                // Create a "Security User"
                user = await context.security.users.createUser(
                    {
                        login: identity.id,
                        firstName: identity.firstName || "",
                        lastName: identity.lastName || "",
                        avatar: identity.avatar
                    },
                    { auth: false }
                );
            }

            await executeCallback<UserPlugin["onLogin"]>(userPlugins, "onLogin", {
                context,
                user,
                firstLogin
            });

            return user;
        },

        async createToken(
            identity: SecurityIdentity,
            data: CreatePersonalAccessTokenInput
        ): Promise<UserPersonalAccessToken> {
            await new CreateAccessTokenDataModel().populate(data).validate();

            const token: UserPersonalAccessToken = {
                ...data,
                id: mdbid(),
                login: identity.id,
                createdOn: new Date().toISOString()
            };
            try {
                return await storageOperations.createToken({
                    identity,
                    token
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.messagge || "Could not create user access token.",
                    ex.code || "CREATE_USER_ACCESS_TOKEN_ERROR",
                    {
                        ...(ex.data || {}),
                        token
                    }
                );
            }
        },

        async createUser(data: CreateUserInput, options: { auth?: boolean } = {}): Promise<User> {
            const { security, tenancy } = context;

            const auth = "auth" in options ? options.auth : true;

            if (auth) {
                const permission = await security.getPermission("security.user");
                if (!permission) {
                    throw new NotAuthorizedError();
                }
            }

            const login = data.login.toLowerCase();
            const identity = security.getIdentity();

            const existing = await context.security.users.getUser(login, {
                auth: false
            });

            if (existing) {
                throw new WebinyError("User with that login already exists.", "USER_EXISTS");
            }
            let createdBy = null;
            if (identity) {
                createdBy = {
                    id: identity.id,
                    displayName: identity.displayName,
                    type: identity.type
                };
            }

            const user: User = {
                ...data,
                id: mdbid(),
                login,
                createdOn: new Date().toISOString(),
                createdBy
            };
            let result: User;
            try {
                await executeCallback<UserPlugin["beforeCreate"]>(userPlugins, "beforeCreate", {
                    context,
                    user,
                    inputData: data
                });
                result = await storageOperations.createUser({
                    user
                });
                await executeCallback<UserPlugin["afterCreate"]>(userPlugins, "afterCreate", {
                    context,
                    user: result,
                    inputData: data
                });
                const tenant = tenancy.getCurrentTenant();
                const group = await security.groups.getGroup(data.group);
                await security.users.linkUserToTenant(result.login, tenant, group);
                return result;
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not create user.",
                    ex.code || "CREATE_USER_ERROR",
                    {
                        ...(ex.data || {}),
                        user: result || user
                    }
                );
            }
        },

        async deleteToken(id: string): Promise<boolean> {
            const identity = context.security.getIdentity();
            if (!identity) {
                throw new Error("Not authorized!");
            }
            const token = await context.security.users.getPersonalAccessToken(identity.id, id);

            if (!token) {
                throw new NotFoundError(`PAT "${id}" was not found!`);
            }

            try {
                await storageOperations.deleteToken({
                    identity,
                    token
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not delete user access token.",
                    ex.code || "DELETE_USER_ACCESS_TOKEN_ERROR",
                    {
                        ...(ex.data || {}),
                        identity,
                        token
                    }
                );
            }

            return true;
        },

        async deleteUser(login: string): Promise<boolean> {
            const { security } = context;

            const permission = await security.getPermission("security.user");
            if (!permission) {
                throw new NotAuthorizedError();
            }

            const user = await context.security.users.getUser(login);
            const identity = security.getIdentity();

            if (!user) {
                throw new NotFoundError(`User "${login}" was not found!`);
            }

            if (user.login === identity.id) {
                throw new WebinyError(`You can't delete your own user account.`);
            }

            try {
                await executeCallback<UserPlugin["beforeDelete"]>(userPlugins, "beforeDelete", {
                    context,
                    user
                });

                await storageOperations.deleteUser({
                    user
                });

                loaders.clearLoadersCache(login);

                await executeCallback<UserPlugin["afterDelete"]>(userPlugins, "afterDelete", {
                    context,
                    user
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.messagge || "Could not delete user.",
                    ex.code || "DELETE_USER_ERROR",
                    {
                        ...(ex.data || {}),
                        user
                    }
                );
            }

            return true;
        },

        async getPersonalAccessToken(
            login: string,
            tokenId: string
        ): Promise<UserPersonalAccessToken> {
            try {
                return storageOperations.getPersonalAccessToken({
                    login,
                    tokenId
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.messagge || "Could not get user access token.",
                    ex.code || "GET_USER_ACCESS_TOKEN_ERROR",
                    {
                        ...(ex.data || {}),
                        login,
                        tokenId
                    }
                );
            }
        },

        async getUser(login: string, options: { auth?: boolean } = {}): Promise<User> {
            const { security } = context;
            const auth = "auth" in options ? options.auth : true;

            if (auth) {
                const permission = await security.getPermission("security.user");

                if (!permission) {
                    throw new NotAuthorizedError();
                }
            }

            return loaders.getUser.load(login);
        },

        async getUserAccess(login: string): Promise<TenantAccess[]> {
            return loaders.getUserAccess.load(login);
        },

        async getUserByPersonalAccessToken(token: string): Promise<User> {
            try {
                return await storageOperations.getUserByPersonalAccessToken({
                    token
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not get user via PAT.",
                    ex.code || "GET_USER_VIA_PAT_ERROR",
                    {
                        ...(ex.data || {}),
                        token
                    }
                );
            }
        },

        async linkUserToTenant(id: string, tenant: Tenant, group: Group): Promise<void> {
            const user = await context.security.users.getUser(id, {
                auth: false
            });
            if (!user) {
                throw new WebinyError("User not found.", "USER_NOT_FOUND", {
                    id
                });
            }
            const link: TenantAccess = {
                tenant: {
                    id: tenant.id,
                    name: tenant.name
                },
                group: {
                    slug: group.slug,
                    name: group.name,
                    permissions: group.permissions
                }
            };

            try {
                await storageOperations.linkUserToTenant({
                    user,
                    tenant,
                    group,
                    link
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.messsage || "Cannot link user to tenant.",
                    ex.code || "LINK_USER_TO_TENANT_ERROR",
                    {
                        ...(ex.data || {}),
                        link,
                        user
                    }
                );
            }
            /**
             * Add the data into cache so it is not loaded again if required in this request.
             */
            await loaders.addDataLoaderAccessCache(id, link);
        },

        async unlinkUserFromTenant(id: string, tenant: Tenant): Promise<void> {
            const user = await context.security.users.getUser(id, {
                auth: false
            });
            if (!user) {
                throw new WebinyError("User not found.", "USER_NOT_FOUND", {
                    id
                });
            }

            try {
                await storageOperations.unlinkUserFromTenant({
                    tenant,
                    user
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.messsage || "Cannot unlink user from tenant.",
                    ex.code || "UNLINK_USER_FROM_TENANT_ERROR",
                    {
                        ...(ex.data || {}),
                        tenant,
                        user
                    }
                );
            }
            await loaders.deleteDataLoaderAccessCache(id, tenant);
        },

        async listTokens(login: string): Promise<UserPersonalAccessToken[]> {
            try {
                return storageOperations.listTokens({
                    login
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.messsage || "Cannot list user tokens.",
                    ex.code || "LIST_TOKENS_ERROR",
                    {
                        ...(ex.data || {}),
                        login
                    }
                );
            }
        },

        async listUsers(params: { tenant?: string; auth?: boolean } = {}): Promise<User[]> {
            const { security, tenancy } = context;

            const auth = "auth" in params ? params.auth : true;

            if (auth) {
                const permission = await security.getPermission("security.user");

                if (!permission) {
                    throw new NotAuthorizedError();
                }
            }

            const tenant = params.tenant || tenancy.getCurrentTenant().id;

            try {
                return storageOperations.listUsers({
                    where: {
                        tenant
                    }
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.messsage || "Cannot list users.",
                    ex.code || "LIST_USERS_ERROR",
                    {
                        ...(ex.data || {}),
                        tenant
                    }
                );
            }
        },

        async updateToken(
            login: string,
            tokenId: string,
            data: UpdatePersonalAccessTokenInput
        ): Promise<UpdatePersonalAccessTokenInput> {
            const { name } = data;
            await new UpdateAccessTokenDataModel().populate({ name }).validate();

            const original = await context.security.users.getPersonalAccessToken(login, tokenId);

            const token: UserPersonalAccessToken = {
                ...original,
                name
            };
            try {
                return await storageOperations.updateToken({
                    original,
                    token
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.messsage || "Cannot update token.",
                    ex.code || "UPDATE_TOKEN_ERROR",
                    {
                        ...(ex.data || {}),
                        original,
                        token
                    }
                );
            }
        },

        async updateUser(login: string, data: UpdateUserInput): Promise<User> {
            const { security, tenancy } = context;
            const permission = await security.getPermission("security.user");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            const original = await security.users.getUser(login);
            if (!original) {
                throw new NotFoundError(`User "${login}" was not found!`);
            }

            const updateData = cloneDeep(data);

            const user: User = {
                ...original,
                ...updateData
            };

            try {
                await executeCallback<UserPlugin["beforeUpdate"]>(userPlugins, "beforeUpdate", {
                    context,
                    user,
                    updateData,
                    inputData: data
                });
                const result = await storageOperations.updateUser({
                    original,
                    user
                });
                await executeCallback<UserPlugin["afterUpdate"]>(userPlugins, "afterUpdate", {
                    context,
                    user,
                    inputData: data
                });
                /**
                 * Cache clear and updating.
                 */
                await loaders.updateDataLoaderUserCache(login, updateData);
                loaders.clearDataLoaderAccessCache(login);
                /**
                 * If there is a group defined, remove the existing one and add the new one.
                 */
                if (data.group) {
                    const tenant = tenancy.getCurrentTenant();
                    await security.users.unlinkUserFromTenant(result.login, tenant);

                    const group = await security.groups.getGroup(data.group);

                    await security.users.linkUserToTenant(result.login, tenant, group);
                }
                return result;
            } catch (ex) {
                throw new WebinyError(
                    ex.messsage || "Cannot update user.",
                    ex.code || "UPDATE_USER_ERROR",
                    {
                        ...(ex.data || {}),
                        original,
                        user
                    }
                );
            }
        }
    };
});

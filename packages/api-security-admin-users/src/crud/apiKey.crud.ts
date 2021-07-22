import crypto from "crypto";
import { withFields, string } from "@commodo/fields";
import { object } from "commodo-fields-object";
import { validation } from "@webiny/validation";
import mdbid from "mdbid";
import { AdminUsersContext, ApiKey, ApiKeyPermission } from "~/types";
import { NotAuthorizedError } from "@webiny/api-security";
import { NotFoundError } from "@webiny/handler-graphql";
import { ApiKeyStorageOperationsProvider } from "~/plugins/ApiKeyStorageOperationsProvider";
import WebinyError from "@webiny/error";
import { ContextPlugin } from "@webiny/handler/plugins/ContextPlugin";

const APIKeyModel = withFields({
    name: string({ validation: validation.create("required") }),
    description: string({ validation: validation.create("required") }),
    permissions: object({ list: true, value: [] })
})();

const generateToken = (tokenLength = 48) => {
    const token = crypto.randomBytes(Math.ceil(tokenLength / 2)).toString("hex");

    // API Keys are prefixed with a letter "a" to make token verification easier.
    // When authentication plugins kick in, they will be able to tell if they should handle the token by
    // checking the first letter and either process the token or skip authentication completely.
    if (token.startsWith("a")) {
        return token;
    }

    return `a${token.slice(0, tokenLength - 1)}`;
};
/*
export default (context: AdminUsersContext): ApiKeysCRUD => {
    const { db, security, tenancy } = context;

    return {
        async getApiKeyByToken(token) {
            const tenant = tenancy.getCurrentTenant();
            const [[apiKey]] = await db.read<DbItem<ApiKey>>({
                ...dbArgs,
                query: {
                    GSI1_PK: `T#${tenant.id}`,
                    GSI1_SK: `API_KEY#${token}`
                }
            });

            return apiKey;
        },
        async getApiKey(id) {
            // Check if it's an ID or an actual API key (API keys start with a letter "a")
            const tenant = tenancy.getCurrentTenant();
            const permission = await security.getPermission<ApiKeyPermission>("security.apiKey");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            const [[apiKey]] = await db.read<DbItem<ApiKey>>({
                ...dbArgs,
                query: {
                    PK: `T#${tenant.id}`,
                    SK: `API_KEY#${id}`
                }
            });

            return apiKey;
        },
        async listApiKeys() {
            const tenant = tenancy.getCurrentTenant();
            const permission = await security.getPermission<ApiKeyPermission>("security.apiKey");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            const [apiKeys] = await db.read<DbItem<ApiKey>>({
                ...dbArgs,
                query: {
                    PK: `T#${tenant.id}`,
                    SK: { $beginsWith: "API_KEY#" }
                }
            });

            return apiKeys;
        },
        async createApiKey(data) {
            const identity = security.getIdentity();
            const tenant = tenancy.getCurrentTenant();
            const permission = await security.getPermission<ApiKeyPermission>("security.apiKey");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            await new APIKeyModel().populate(data).validate();

            const apiKey: ApiKey = {
                id: mdbid(),
                tenant: tenant.id,
                token: generateToken(),
                createdBy: {
                    id: identity.id,
                    displayName: identity.displayName,
                    type: identity.type
                },
                createdOn: new Date().toISOString(),
                ...data
            };

            await db.create({
                ...dbArgs,
                data: {
                    PK: `T#${tenant.id}`,
                    SK: `API_KEY#${apiKey.id}`,
                    GSI1_PK: `T#${tenant.id}`,
                    GSI1_SK: `API_KEY#${apiKey.token}`,
                    TYPE: "security.apiKey",
                    ...apiKey
                }
            });

            return apiKey;
        },
        async updateApiKey(id, data) {
            const tenant = tenancy.getCurrentTenant();
            const permission = await security.getPermission<ApiKeyPermission>("security.apiKey");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            const model = new APIKeyModel().populate(data);
            await model.validate();
            const changedData = await model.toJSON({ onlyDirty: true });

            const apiKey = await this.getApiKey(id);
            if (!apiKey) {
                throw new NotFoundError(`API key "${id}" was not found!`);
            }

            await db.update({
                ...dbArgs,
                query: {
                    PK: `T#${tenant.id}`,
                    SK: `API_KEY#${apiKey.id}`
                },
                data: changedData
            });

            return Object.assign({}, apiKey, changedData);
        },
        async deleteApiKey(id) {
            const tenant = tenancy.getCurrentTenant();
            const permission = await security.getPermission<ApiKeyPermission>("security.apiKey");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            await db.delete({
                ...dbArgs,
                query: {
                    PK: `T#${tenant.id}`,
                    SK: `API_KEY#${id}`
                }
            });

            return true;
        }
    };
};
*/
export default new ContextPlugin<AdminUsersContext>(async context => {
    const { security, tenancy } = context;

    const pluginType = ApiKeyStorageOperationsProvider.type;

    const providerPlugin = context.plugins
        .byType<ApiKeyStorageOperationsProvider>(pluginType)
        .find(() => true);

    if (!providerPlugin) {
        throw new WebinyError(`Missing "${pluginType}" plugin.`, "PLUGIN_NOT_FOUND", {
            type: pluginType
        });
    }

    const storageOperations = await providerPlugin.provide({
        context
    });

    context.security.apiKeys = {
        async getApiKeyByToken(token) {
            try {
                return await storageOperations.getByToken({
                    token
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not get API key by token.",
                    ex.code || "GET_API_KEY_BY_TOKEN_ERROR",
                    {
                        token
                    }
                );
            }
        },
        async getApiKey(id) {
            // Check if it's an ID or an actual API key (API keys start with a letter "a")
            const permission = await security.getPermission<ApiKeyPermission>("security.apiKey");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            try {
                return await storageOperations.get({
                    id
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not get API key.",
                    ex.code || "GET_API_KEY_ERROR",
                    {
                        id
                    }
                );
            }
        },
        async listApiKeys() {
            const permission = await security.getPermission<ApiKeyPermission>("security.apiKey");

            if (!permission) {
                throw new NotAuthorizedError();
            }
            try {
                return await storageOperations.list({
                    sort: ["createdOn_ASC"]
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not list API keys.",
                    ex.code || "LIST_API_KEY_ERROR"
                );
            }
        },
        async createApiKey(data) {
            const identity = security.getIdentity();
            const tenant = tenancy.getCurrentTenant();
            const permission = await security.getPermission<ApiKeyPermission>("security.apiKey");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            await new APIKeyModel().populate(data).validate();

            const apiKey: ApiKey = {
                id: mdbid(),
                tenant: tenant.id,
                token: generateToken(),
                createdBy: {
                    id: identity.id,
                    displayName: identity.displayName,
                    type: identity.type
                },
                createdOn: new Date().toISOString(),
                ...data
            };

            try {
                return await storageOperations.create({
                    apiKey
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not create API key.",
                    ex.code || "CREATE_API_KEY_ERROR",
                    {
                        apiKey
                    }
                );
            }
        },
        async updateApiKey(id, data) {
            const permission = await security.getPermission<ApiKeyPermission>("security.apiKey");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            const model = new APIKeyModel().populate(data);
            await model.validate();
            const changedData = await model.toJSON({ onlyDirty: true });

            const original = await this.getApiKey(id);
            if (!original) {
                throw new NotFoundError(`API key "${id}" was not found!`);
            }

            const apiKey: ApiKey = {
                ...original,
                ...changedData
            };
            try {
                return await storageOperations.update({
                    original,
                    apiKey
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not update API key.",
                    ex.code || "UPDATE_API_KEY_ERROR",
                    {
                        original,
                        apiKey
                    }
                );
            }
        },
        async deleteApiKey(id) {
            const permission = await security.getPermission<ApiKeyPermission>("security.apiKey");

            if (!permission) {
                throw new NotAuthorizedError();
            }

            const apiKey = await this.getApiKey(id);
            if (!apiKey) {
                throw new NotFoundError(`API key "${id}" was not found!`);
            }

            try {
                await storageOperations.delete({
                    apiKey
                });
                return true;
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not delete API key.",
                    ex.code || "DELETE_API_KEY_ERROR",
                    {
                        apiKey
                    }
                );
            }
        }
    };
});

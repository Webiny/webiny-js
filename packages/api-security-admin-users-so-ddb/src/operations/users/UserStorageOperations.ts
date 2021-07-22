import {
    AdminUsersContext,
    User,
    UserStorageOperations,
    UserStorageOperationsCreateParams,
    UserStorageOperationsUpdateParams,
    UserStorageOperationsDeleteParams,
    UserStorageOperationsGetParams,
    UserStorageOperationsListParams,
    DbItemSecurityUser2Tenant,
    UserStorageOperationsLinkUserToTenantParams,
    Group,
    UserStorageOperationsUnlinkUserFromTenantParams,
    UserPersonalAccessToken,
    UserStorageOperationsCreateTokenParams,
    UserStorageOperationsDeleteTokenParams,
    UserStorageOperationsGetTokenParams,
    UserStorageOperationsGetUserByPatParams,
    UserStorageOperationsListTokensParams,
    UserStorageOperationsUpdateTokenParams
} from "@webiny/api-security-admin-users/types";
import { createTable } from "~/definitions/table";
import { createUserEntity } from "~/definitions/userEntity";
import { Entity, Table } from "dynamodb-toolbox";
import WebinyError from "@webiny/error";
import { cleanupItem } from "@webiny/db-dynamodb/utils/cleanup";
import { queryAll, QueryAllParams, queryOne, QueryParams } from "@webiny/db-dynamodb/utils/query";
import { createLinksEntity } from "~/definitions/linksEntity";
import { batchReadAll } from "@webiny/db-dynamodb/utils/batchRead";
import { batchWriteAll } from "@webiny/db-dynamodb/utils/batchWrite";
import { Tenant } from "@webiny/api-tenancy/types";
import { createTokenEntity } from "~/definitions/tokenEntity";
import { NotFoundError } from "jest-dynalite/dist/config";

interface Params {
    context: AdminUsersContext;
}

export class UserStorageOperationsDdb implements UserStorageOperations {
    private readonly context: AdminUsersContext;
    private readonly table: Table;
    private readonly entity: Entity<any>;
    private readonly tokenEntity: Entity<any>;
    private readonly linksEntity: Entity<any>;

    public constructor({ context }: Params) {
        this.context = context;

        this.table = createTable({
            context
        });

        this.entity = createUserEntity({
            context,
            table: this.table
        });

        this.tokenEntity = createTokenEntity({
            context,
            table: this.table
        });

        this.linksEntity = createLinksEntity({
            context,
            table: this.table
        });
    }

    public async getUser(params: UserStorageOperationsGetParams): Promise<User | null> {
        const { id } = params;
        const keys = {
            PK: this.createPartitionKey(id),
            SK: this.createUserSortKey()
        };

        try {
            const result = await this.entity.get(keys);
            if (!result || !result.Item) {
                return null;
            }
            return this.cleanupItem(result.Item);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not load user.",
                ex.code || "GET_USER_ERROR",
                {
                    keys,
                    id
                }
            );
        }
    }

    public async getUserByPersonalAccessToken(
        params: UserStorageOperationsGetUserByPatParams
    ): Promise<User> {
        const { token } = params;
        const queryParams: QueryParams = {
            partitionKey: "PAT",
            entity: this.tokenEntity,
            options: {
                index: "GSI1",
                eq: token,
                limit: 1
            }
        };
        let login = undefined;
        try {
            const result = await queryOne<UserPersonalAccessToken>(queryParams);
            if (!result) {
                throw new NotFoundError("Could not find token info.");
            }
            login = result.login;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not find token info.",
                ex.code || "GET_USER_ERROR",
                {
                    queryParams
                }
            );
        }

        return this.getUser({
            id: login
        });
    }

    public async listUsers(params: UserStorageOperationsListParams): Promise<User[]> {
        const { where } = params;

        let userTenantAccessList: DbItemSecurityUser2Tenant[] = [];
        const usersPartitionKey = `T#${where.tenant}`;
        const usersOptions = {
            beginsWith: "G#"
        };
        try {
            userTenantAccessList = await queryAll({
                entity: this.linksEntity,
                partitionKey: usersPartitionKey,
                options: usersOptions
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Cannot load users via secondary index.",
                ex.code || "LIST_USERS_VIA_SECONDARY_INDEX_ERROR",
                {
                    partitionKey: usersPartitionKey,
                    options: usersOptions
                }
            );
        }
        const batch = userTenantAccessList.map(item => {
            return this.entity.getBatch({
                PK: item.PK,
                SK: "A"
            });
        });

        try {
            const users = await batchReadAll<User>({
                table: this.table,
                items: batch
            });
            return users.map(user => this.cleanupItem(user));
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Cannot load users.",
                ex.code || "LIST_USERS_ERROR"
            );
        }
    }

    public async createUser(params: UserStorageOperationsCreateParams): Promise<User> {
        const { user } = params;
        const keys = {
            PK: this.createUserPartitionKey(user),
            SK: this.createUserSortKey()
        };
        try {
            await this.entity.put({
                ...user,
                TYPE: "security.user",
                ...keys
            });
            return user;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not store user to the DDB.",
                ex.code || "CREATE_USER_DDB_ERROR",
                {
                    keys,
                    user
                }
            );
        }
    }

    public async updateUser(params: UserStorageOperationsUpdateParams): Promise<User> {
        const { user, original } = params;
        const keys = {
            PK: this.createUserPartitionKey(user),
            SK: this.createUserSortKey()
        };
        try {
            await this.entity.put({
                ...user,
                ...keys
            });
            return user;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not save user to the DDB.",
                ex.code || "UPDATE_USER_DDB_ERROR",
                {
                    keys,
                    user,
                    original
                }
            );
        }
    }

    public async deleteUser(params: UserStorageOperationsDeleteParams): Promise<User> {
        const { user } = params;

        let items = [];
        try {
            items = await queryAll({
                entity: this.entity,
                partitionKey: this.createUserPartitionKey(user),
                options: {
                    gt: " "
                }
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not load users data.",
                ex.code || "LIST_USER_DATA_ERROR",
                {
                    user
                }
            );
        }

        try {
            await batchWriteAll({
                table: this.table,
                items: items.map(item => {
                    return this.entity.deleteBatch({
                        PK: item.PK,
                        SK: item.SK
                    });
                })
            });
            return user;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not delete user data.",
                ex.code || "DELETE_USER_DATA_ERROR",
                {
                    user
                }
            );
        }
    }

    public async linkUserToTenant(
        params: UserStorageOperationsLinkUserToTenantParams
    ): Promise<void> {
        const { user, group, tenant, link } = params;
        const keys = {
            PK: this.createUserPartitionKey(user),
            SK: this.createLinkSortKey(tenant, group),
            GSI1_PK: this.createGsiPartitionKey(tenant),
            GSI1_SK: this.createGsiSortKey(group, user)
        };

        try {
            await this.linksEntity.put({
                ...keys,
                TYPE: "security.user2tenant",
                ...link
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not create user <-> group link.",
                ex.code || "CREATE_USER_LINK_ERROR",
                {
                    link,
                    keys
                }
            );
        }
    }

    public async unlinkUserFromTenant(
        params: UserStorageOperationsUnlinkUserFromTenantParams
    ): Promise<void> {
        const { tenant, user } = params;
        let userTenantAccessList: DbItemSecurityUser2Tenant[] = [];
        const usersPartitionKey = this.createUserPartitionKey(user);
        const usersOptions = {
            beginsWith: `LINK#T#${tenant.id}#G#`,
            limit: 1
        };
        try {
            userTenantAccessList = await queryAll({
                entity: this.linksEntity,
                partitionKey: usersPartitionKey,
                options: usersOptions
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Cannot load users via secondary index.",
                ex.code || "LIST_USERS_VIA_SECONDARY_INDEX_ERROR",
                {
                    partitionKey: usersPartitionKey,
                    options: usersOptions
                }
            );
        }
        if (userTenantAccessList.length === 0) {
            throw new WebinyError("Could not find a relation user <-> tenant");
        }
        const keys = {
            PK: userTenantAccessList[0].PK,
            SK: userTenantAccessList[0].SK
        };
        try {
            await this.entity.delete(keys);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not delete link user <-> tenant.",
                ex.code || "DELETE_LINK_USER_TENANT_ERROR",
                {
                    keys,
                    user
                }
            );
        }
    }

    public async createToken(
        params: UserStorageOperationsCreateTokenParams
    ): Promise<UserPersonalAccessToken> {
        const { identity, token } = params;
        const keys = {
            PK: this.createPartitionKey(identity.id),
            SK: `PAT#${token.id}`,
            GSI1_PK: "PAT",
            GSI1_SK: token.token
        };
        try {
            await this.tokenEntity.put({
                ...token,
                ...keys,
                TYPE: "security.pat"
            });
            return token;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Cannot create user access token.",
                ex.code || "CREATE_USER_ACCESS_TOKEN_ERROR",
                {
                    keys,
                    token
                }
            );
        }
    }

    public async updateToken(
        params: UserStorageOperationsUpdateTokenParams
    ): Promise<UserPersonalAccessToken> {
        const { original, token } = params;
        const keys = {
            PK: `U#${original.login}`,
            SK: `PAT#${original.id}`
        };

        try {
            await this.tokenEntity.put({
                ...token,
                ...keys
            });
            return token;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Cannot update user access token.",
                ex.code || "UPDATE_USER_ACCESS_TOKEN_ERROR",
                {
                    keys,
                    token,
                    original
                }
            );
        }
    }

    public async deleteToken(
        params: UserStorageOperationsDeleteTokenParams
    ): Promise<UserPersonalAccessToken> {
        const { identity, token } = params;
        const keys = {
            PK: this.createPartitionKey(identity.id),
            SK: `PAT#${token.id}`
        };

        try {
            await this.tokenEntity.delete(keys);
            return token;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Cannot delete user access token.",
                ex.code || "DELETE_USER_ACCESS_TOKEN_ERROR",
                {
                    keys,
                    token
                }
            );
        }
    }

    public async getPersonalAccessToken(
        params: UserStorageOperationsGetTokenParams
    ): Promise<UserPersonalAccessToken> {
        const { login, tokenId } = params;
        const keys = {
            PK: `U#${login}`,
            SK: `PAT#${tokenId}`
        };
        try {
            const result = await this.tokenEntity.get(keys);
            if (!result || !result.Item) {
                return null;
            }
            return this.cleanupTokenItem(result.Item);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Cannot get user access token.",
                ex.code || "GET_USER_ACCESS_TOKEN_ERROR",
                {
                    login,
                    tokenId
                }
            );
        }
    }

    public async listTokens(
        params: UserStorageOperationsListTokensParams
    ): Promise<UserPersonalAccessToken[]> {
        const { login } = params;
        const queryParams: QueryAllParams = {
            entity: this.tokenEntity,
            partitionKey: `U#${login}`,
            options: {
                beginsWith: "PAT#"
            }
        };
        try {
            return await queryAll<UserPersonalAccessToken>(queryParams);
        } catch (ex) {
            throw new WebinyError(
                ex.messsage || "Cannot list user tokens.",
                ex.code || "LIST_TOKENS_ERROR",
                {
                    login
                }
            );
        }
    }

    private cleanupItem(item: User & Record<string, any>): User {
        return cleanupItem(this.entity, item);
    }

    private cleanupTokenItem(
        item: UserPersonalAccessToken & Record<string, any>
    ): UserPersonalAccessToken {
        return cleanupItem(this.tokenEntity, item);
    }
    /**
     * There is a need for this method because of the old way of saving the user data.
     */
    private createUserPartitionKey(user: User): string {
        return this.createPartitionKey(user.id || user.login);
    }

    private createPartitionKey(id: string): string {
        return `U#${id}`;
    }

    private createUserSortKey(): string {
        return "A";
    }

    private createLinkSortKey(tenant: Tenant, group: Group): string {
        return `LINK#T#${tenant.id}#G#${group.slug}`;
    }

    private createGsiPartitionKey(tenant: Tenant): string {
        return `T#${tenant.id}`;
    }

    private createGsiSortKey(group: Group, user: User): string {
        return `G#${group.slug}#U#${user.id || user.login}`;
    }
}

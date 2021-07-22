import {
    AdminUsersContext,
    ApiKey,
    ApiKeyStorageOperations,
    ApiKeyStorageOperationsCreateParams,
    ApiKeyStorageOperationsDeleteParams,
    ApiKeyStorageOperationsGetByTokenParams,
    ApiKeyStorageOperationsGetParams,
    ApiKeyStorageOperationsListParams,
    ApiKeyStorageOperationsUpdateParams
} from "@webiny/api-security-admin-users/types";
import WebinyError from "@webiny/error";
import { Entity, Table } from "dynamodb-toolbox";
import { createTable } from "~/definitions/table";
import { createApiKeyEntity } from "~/definitions/apiKeyEntity";
import { cleanupItem } from "@webiny/db-dynamodb/utils/cleanup";
import { queryAll } from "@webiny/db-dynamodb/utils/query";
import { sortItems } from "@webiny/db-dynamodb/utils/sort";

interface Params {
    context: AdminUsersContext;
}

export class ApiKeyStorageOperationsDdb implements ApiKeyStorageOperations {
    private readonly context: AdminUsersContext;
    private readonly table: Table;
    private readonly entity: Entity<any>;

    public constructor({ context }: Params) {
        this.context = context;

        this.table = createTable({
            context
        });

        this.entity = createApiKeyEntity({
            context,
            table: this.table
        });
    }

    public async get({ id }: ApiKeyStorageOperationsGetParams): Promise<ApiKey> {
        const keys = {
            PK: this.createPartitionKey(),
            SK: this.createSortKey(id)
        };

        try {
            const result = await this.entity.get(keys);
            if (!result || !result.Item) {
                return null;
            }
            return this.cleanupItem(result.Item);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not load api key.",
                ex.code || "GET_API_KEY_ERROR",
                {
                    keys,
                    id
                }
            );
        }
    }

    public async getByToken({ token }: ApiKeyStorageOperationsGetByTokenParams): Promise<ApiKey> {
        const keys = {
            GSI1_PK: this.createGsiPartitionKey(),
            GSI1_SK: this.createGsiSortKey(token)
        };

        try {
            const result = await this.entity.get(keys);
            if (!result || !result.Item) {
                return null;
            }
            return this.cleanupItem(result.Item);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not load api key by token.",
                ex.code || "GET_BY_TOKEN_API_KEY_ERROR",
                {
                    keys,
                    token
                }
            );
        }
    }

    public async list({ sort }: ApiKeyStorageOperationsListParams): Promise<ApiKey[]> {
        let items: ApiKey[] = [];
        try {
            items = await queryAll<ApiKey>({
                entity: this.entity,
                partitionKey: this.createPartitionKey(),
                options: {
                    beginsWith: "API_KEY#"
                }
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not list api keys.",
                ex.code || "LIST_API_KEY_ERROR"
            );
        }

        const sortedItems = sortItems({
            items,
            sort,
            context: this.context,
            fields: ["createdOn_DESC"]
        });
        return sortedItems.map(item => this.cleanupItem(item));
    }

    public async create({ apiKey }: ApiKeyStorageOperationsCreateParams): Promise<ApiKey> {
        const keys = {
            PK: this.createPartitionKey(),
            SK: this.createSortKey(apiKey.id),
            GSI1_PK: this.createGsiPartitionKey(),
            GSI1_SK: this.createGsiSortKey(apiKey.token)
        };

        try {
            await this.entity.put({
                ...apiKey,
                TYPE: "security.apiKey",
                ...keys
            });
            return apiKey;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not create api key.",
                ex.code || "CREATE_API_KEY_ERROR",
                {
                    keys
                }
            );
        }
    }

    public async update({ apiKey }: ApiKeyStorageOperationsUpdateParams): Promise<ApiKey> {
        const keys = {
            PK: this.createPartitionKey(),
            SK: this.createSortKey(apiKey.id)
        };

        try {
            await this.entity.put({
                ...apiKey,
                TYPE: "security.apiKey",
                ...keys
            });
            return apiKey;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not update api key.",
                ex.code || "UPDATE_API_KEY_ERROR",
                {
                    keys
                }
            );
        }
    }

    public async delete({ apiKey }: ApiKeyStorageOperationsDeleteParams): Promise<ApiKey> {
        const keys = {
            PK: this.createPartitionKey(),
            SK: this.createSortKey(apiKey.id)
        };

        try {
            await this.entity.delete(keys);
            return apiKey;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not update api key.",
                ex.code || "UPDATE_API_KEY_ERROR",
                {
                    keys
                }
            );
        }
    }

    private cleanupItem(item: ApiKey & Record<string, any>): ApiKey {
        return cleanupItem(this.entity, item, ["TYPE"]);
    }

    private createPartitionKey(): string {
        return `T#${this.context.tenancy.getCurrentTenant().id}`;
    }

    private createSortKey(id: string): string {
        return `API_KEY#${id}`;
    }

    private createGsiPartitionKey(): string {
        return `T#${this.context.tenancy.getCurrentTenant().id}`;
    }

    private createGsiSortKey(token: string): string {
        return `API_KEY#${token}`;
    }
}

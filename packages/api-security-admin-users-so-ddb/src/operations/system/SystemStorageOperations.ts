import {
    AdminUsersContext,
    System,
    SystemStorageOperations,
    SystemStorageOperationsCreateParams,
    SystemStorageOperationsUpdateParams
} from "@webiny/api-security-admin-users/types";
import { createTable } from "~/definitions/table";
import { Entity, Table } from "dynamodb-toolbox";
import { createSystemEntity } from "~/definitions/systemEntity";
import { cleanupItem } from "@webiny/db-dynamodb/utils/cleanup";
import WebinyError from "@webiny/error";

interface Params {
    context: AdminUsersContext;
}

export class SystemStorageOperationsDdb implements SystemStorageOperations {
    private readonly context: AdminUsersContext;
    private readonly table: Table;
    private readonly entity: Entity<any>;

    public constructor({ context }: Params) {
        this.context = context;

        this.table = createTable({
            context
        });

        this.entity = createSystemEntity({
            context,
            table: this.table
        });
    }

    public async get(): Promise<System> {
        const keys = {
            PK: this.createPartitionKey(),
            SK: this.createSortKey()
        };
        try {
            const result = await this.entity.get(keys);
            if (!result || !result.Item) {
                return null;
            }
            return cleanupItem(this.entity, result.Item);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not load system.",
                ex.code || "GET_SYSTEM_ERROR",
                {
                    keys
                }
            );
        }
    }

    public async create(params: SystemStorageOperationsCreateParams): Promise<System> {
        const { system } = params;
        const keys = {
            PK: this.createPartitionKey(),
            SK: this.createSortKey()
        };
        try {
            await this.entity.put({
                ...keys,
                ...system
            });
            return system;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not create system.",
                ex.code || "CREATE_SYSTEM_ERROR",
                {
                    keys,
                    system
                }
            );
        }
    }

    public async update(params: SystemStorageOperationsUpdateParams): Promise<System> {
        const { original, system } = params;
        const keys = {
            PK: this.createPartitionKey(),
            SK: this.createSortKey()
        };
        try {
            await this.entity.put({
                ...keys,
                ...system
            });
            return system;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not update system.",
                ex.code || "UPDATE_SYSTEM_ERROR",
                {
                    keys,
                    system,
                    original
                }
            );
        }
    }

    private createPartitionKey() {
        return `T#${this.context.tenancy.getCurrentTenant().id}#SYSTEM`;
    }

    private createSortKey(): string {
        return "SECURITY";
    }
}

import {
    AdminUsersContext,
    DbItemSecurityUser2Tenant,
    Group,
    GroupsStorageOperations,
    GroupsStorageOperationsCreateParams,
    GroupsStorageOperationsDeleteParams,
    GroupsStorageOperationsGetParams,
    GroupsStorageOperationsListParams,
    GroupsStorageOperationsUpdateParams,
    GroupsStorageOperationsUpdateUserLinksParams
} from "@webiny/api-security-admin-users/types";
import { Entity, Table } from "dynamodb-toolbox";
import { createTable } from "~/definitions/table";
import { createGroupEntity } from "~/definitions/groupEntity";
import { createLinksEntity } from "~/definitions/linksEntity";
import WebinyError from "@webiny/error";
import { cleanupItem } from "@webiny/db-dynamodb/utils/cleanup";
import { queryAll } from "@webiny/db-dynamodb/utils/query";
import { sortItems } from "@webiny/db-dynamodb/utils/sort";
import { batchWriteAll } from "@webiny/db-dynamodb/utils/batchWrite";
import { Tenant } from "@webiny/api-tenancy/types";

interface Params {
    context: AdminUsersContext;
}

export class GroupsStorageOperationsDdb implements GroupsStorageOperations {
    private readonly context: AdminUsersContext;
    private readonly table: Table;
    private readonly entity: Entity<any>;
    private readonly linksEntity: Entity<any>;

    public constructor({ context }: Params) {
        this.context = context;

        this.table = createTable({
            context: this.context
        });

        this.entity = createGroupEntity({
            context,
            table: this.table
        });

        this.linksEntity = createLinksEntity({
            context,
            table: this.table
        });
    }

    public async get(
        tenant: Tenant,
        { slug }: GroupsStorageOperationsGetParams
    ): Promise<Group | null> {
        const keys = {
            PK: this.createPartitionKey(tenant),
            SK: this.createSortKey(slug)
        };
        try {
            const result = await this.entity.get(keys);
            if (!result || !result.Item) {
                return null;
            }
            return this.cleanupItem(result.Item);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not load group.",
                ex.code || "GET_GROUP_ERROR",
                {
                    keys,
                    slug
                }
            );
        }
    }

    public async list(
        tenant: Tenant,
        { sort }: GroupsStorageOperationsListParams
    ): Promise<Group[]> {
        let items: Group[] = [];
        try {
            items = await queryAll<Group>({
                entity: this.entity,
                partitionKey: this.createPartitionKey(tenant),
                options: {
                    beginsWith: "G#"
                }
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not list groups.",
                ex.code || "LIST_GROUP_ERROR"
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

    public async create(
        tenant: Tenant,
        { group }: GroupsStorageOperationsCreateParams
    ): Promise<Group> {
        const keys = {
            PK: this.createPartitionKey(tenant),
            SK: this.createSortKey(group.slug)
        };

        try {
            await this.entity.put({
                ...group,
                TYPE: "security.group",
                ...keys
            });
            return group;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not create group.",
                ex.code || "CREATE_GROUP_ERROR",
                {
                    keys
                }
            );
        }
    }

    public async update(
        tenant: Tenant,
        { group }: GroupsStorageOperationsUpdateParams
    ): Promise<Group> {
        const keys = {
            PK: this.createPartitionKey(tenant),
            SK: this.createSortKey(group.slug)
        };

        try {
            await this.entity.put({
                ...group,
                ...keys
            });
            return group;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not update group.",
                ex.code || "CREATE_UPDATE_ERROR",
                {
                    keys,
                    group
                }
            );
        }
    }

    public async delete(
        tenant: Tenant,
        { group }: GroupsStorageOperationsDeleteParams
    ): Promise<Group> {
        const keys = {
            PK: this.createPartitionKey(tenant),
            SK: this.createSortKey(group.slug)
        };

        try {
            await this.entity.delete({
                ...keys
            });
            return group;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not delete group.",
                ex.code || "CREATE_DELETE_ERROR",
                {
                    keys,
                    group
                }
            );
        }
    }

    public async updateUserLinks(
        tenant: Tenant,
        { group }: GroupsStorageOperationsUpdateUserLinksParams
    ): Promise<void> {
        let links: DbItemSecurityUser2Tenant[] = [];
        try {
            links = await queryAll<DbItemSecurityUser2Tenant>({
                entity: this.entity,
                partitionKey: this.createPartitionKey(tenant),
                options: {
                    index: "GSI1",
                    beginsWith: `${this.createSortKey(group.slug)}#`
                }
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not get all the user <-> group links.",
                ex.code || "USER_GROUP_LINKS_LIST_ERROR"
            );
        }
        const items = links.map(link => {
            return this.linksEntity.putBatch({
                ...link,
                group: {
                    slug: group.slug,
                    name: group.name,
                    permissions: group.permissions
                }
            });
        });
        try {
            await batchWriteAll({
                table: this.table,
                items
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not update user <-> group links.",
                ex.code || "UPDATE_USER_LINKS_ERROR",
                {
                    group
                }
            );
        }
    }

    private cleanupItem(item: Group & Record<string, any>): Group {
        return cleanupItem(this.entity, item, ["TYPE"]);
    }

    private createPartitionKey(tenant: Tenant) {
        return `T#${tenant.id}`;
    }

    private createSortKey(slug: string): string {
        return `G#${slug}`;
    }
}

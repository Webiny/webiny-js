import DataLoader from "dataloader";
import omit from "lodash.omit";
import WebinyError from "@webiny/error";
import { Tenant } from "@webiny/api-tenancy/types";
import dbArgs from "./dbArgs";
import { AdminUsersContext, TenantAccess, User, UserStorageOperations } from "~/types";

interface Params {
    context: AdminUsersContext;
    storageOperations: UserStorageOperations;
}
export class UserLoaders {
    private readonly loaders = new Map<string, DataLoader<any, any>>();
    private readonly context: AdminUsersContext;
    private readonly storageOperations: UserStorageOperations;

    constructor(params: Params) {
        this.context = params.context;
        this.storageOperations = params.storageOperations;
    }

    get getUser() {
        if (!this.loaders.get("getUser")) {
            this.loaders.set(
                "getUser",
                new DataLoader<string, User>(this._getUserLoader.bind(this))
            );
        }
        return this.loaders.get("getUser");
    }

    get getUserAccess() {
        if (!this.loaders.get("getUserAccess")) {
            this.loaders.set(
                "getUserAccess",
                new DataLoader<string, TenantAccess>(this._getUserAccess.bind(this))
            );
        }
        return this.loaders.get("getUserAccess");
    }

    private async _getUserLoader(ids) {
        if (ids.length === 0) {
            return [];
        }
        const batch = this.context.db.batch();
        for (const id of ids) {
            batch.read({
                ...dbArgs,
                query: {
                    PK: `U#${id}`,
                    SK: "A"
                }
            });
        }
        try {
            const results = await batch.execute();
            return results.map(res => {
                if (res[0][0]) {
                    return omit(res[0][0], ["PK", "SK"]);
                }
                return undefined;
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not execute batch read in getUser.",
                ex.code || "BATCH_READ_ERROR",
                {
                    ids
                }
            );
        }
    }

    private async _getUserAccess(ids) {
        if (ids.length === 0) {
            return [];
        }

        const reads = Promise.all(
            ids.map(id => {
                return this.context.db.read({
                    ...dbArgs,
                    query: {
                        PK: `U#${id}`,
                        SK: { $beginsWith: `LINK#` }
                    }
                });
            })
        );
        try {
            const resultGroups = await reads;
            const links = [];
            for (const results of resultGroups) {
                links.push(
                    results[0].map(item => {
                        return {
                            group: item.group,
                            tenant: item.tenant
                        };
                    })
                );
            }
            return links;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not execute multiple read in getUserAccess.",
                ex.code || "MULTIPLE_READ_ERROR",
                {
                    ids
                }
            );
        }
    }

    clearLoadersCache(ids: string) {
        for (const id of ids) {
            this.getUser.clear(id);
            this.getUserAccess.clear(id);
        }
    }

    async updateDataLoaderUserCache(id: string, data: Partial<User>) {
        const user = await this.getUser.load(id);
        this.getUser.clear(id).prime(id, {
            ...user,
            ...data
        });
    }

    async addDataLoaderAccessCache(id: string, data: TenantAccess) {
        const access = await this.getUserAccess.load(id);

        this.getUserAccess.clear(id).prime(id, (access || []).concat([data]));
    }

    clearDataLoaderAccessCache(id: string) {
        this.getUserAccess.clear(id);
    }

    async deleteDataLoaderAccessCache(id: string, tenant: Tenant) {
        const access = await this.getUserAccess.load(id);

        const updatedAccess = (access || []).filter(acc => {
            return acc.tenant.id !== tenant.id;
        });

        this.getUserAccess.clear(id).prime(id, updatedAccess);
    }
}

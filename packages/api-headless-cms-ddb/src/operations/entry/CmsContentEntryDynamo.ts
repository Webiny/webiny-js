import WebinyError from "@webiny/error";
import { DataLoadersHandler } from "./dataLoaders";
import {
    CmsContentEntry,
    CmsContentEntryListWhere,
    CmsContentEntryStorageOperations,
    CmsContentEntryStorageOperationsCreateArgs,
    CmsContentEntryStorageOperationsCreateRevisionFromArgs,
    CmsContentEntryStorageOperationsDeleteArgs,
    CmsContentEntryStorageOperationsDeleteRevisionArgs,
    CmsContentEntryStorageOperationsGetArgs,
    CmsContentEntryStorageOperationsListArgs,
    CmsContentEntryStorageOperationsListResponse,
    CmsContentEntryStorageOperationsPublishArgs,
    CmsContentEntryStorageOperationsRequestChangesArgs,
    CmsContentEntryStorageOperationsRequestReviewArgs,
    CmsContentEntryStorageOperationsUnpublishArgs,
    CmsContentEntryStorageOperationsUpdateArgs,
    CmsContentModel,
    CmsContext,
    CONTENT_ENTRY_STATUS
} from "@webiny/api-headless-cms/types";
import { zeroPad } from "@webiny/api-headless-cms/utils";
import { createBasePartitionKey, decodePaginationCursor, encodePaginationCursor } from "~/utils";
import { Entity, Table } from "dynamodb-toolbox";
import { filterItems, buildModelFields, sortEntryItems } from "./utils";
import { queryOptions as DynamoDBToolboxQueryOptions } from "dynamodb-toolbox/dist/classes/Table";
import lodashCloneDeep from "lodash.clonedeep";
import { createEntryEntity } from "~/definitions/entry";
import { createTable } from "~/definitions/table";

export const TYPE_ENTRY = "cms.entry";
export const TYPE_ENTRY_LATEST = TYPE_ENTRY + ".l";
export const TYPE_ENTRY_PUBLISHED = TYPE_ENTRY + ".p";

export interface CmsContentEntryConfiguration {
    defaultLimit?: number;
    maxLimit?: number;
}

interface ConstructorArgs {
    context: CmsContext;
    configuration: CmsContentEntryConfiguration;
}

interface GetSingleDynamoDBItemArgs {
    partitionKey: string;
    value: any;
    op?: "eq" | "lt" | "lte" | "gt" | "gte" | "between" | "beginsWith";
    order?: string;
}

interface RunQueryArgs {
    options?: DynamoDBToolboxQueryOptions;
    partitionKey: string;
}

const GSI1_INDEX = "GSI1";

const configurationDefaults: CmsContentEntryConfiguration = {
    defaultLimit: 100,
    maxLimit: undefined
};
/**
 * We do not use transactions in this storage operations implementation due to their cost.
 */
export class CmsContentEntryDynamo implements CmsContentEntryStorageOperations {
    private readonly _context: CmsContext;
    private readonly _configuration: CmsContentEntryConfiguration;
    private readonly _partitionKey: string;
    private readonly _modelPartitionKey: string;
    private readonly _dataLoaders: DataLoadersHandler;
    private readonly _table: Table;
    private readonly _entity: Entity<any>;

    private get context(): CmsContext {
        return this._context;
    }

    private get configuration(): CmsContentEntryConfiguration {
        return this._configuration;
    }

    public get table() {
        return this._table;
    }

    public get entity() {
        return this._entity;
    }

    public constructor({ context, configuration }: ConstructorArgs) {
        this._context = context;
        this._configuration = {
            ...configurationDefaults,
            ...(configuration || {})
        };
        this._partitionKey = `${createBasePartitionKey(this.context)}#CME`;
        this._modelPartitionKey = `${this._partitionKey}#M`;
        this._dataLoaders = new DataLoadersHandler(context, this);

        this._table = createTable({
            context,
            indexes: {
                [GSI1_INDEX]: {
                    partitionKey: "GSI1_PK",
                    sortKey: "GSI1_SK"
                }
            }
        });

        this._entity = createEntryEntity({
            table: this._table
        });
    }

    public async create(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsCreateArgs
    ): Promise<CmsContentEntry> {
        const { entry, storageEntry } = args;

        const partitionKey = this.getPartitionKey(entry.id);
        /**
         * We need to:
         *  - create new main entry item
         *  - create new or update latest entry item
         */
        const items = [
            this._entity.putBatch({
                ...storageEntry,
                PK: partitionKey,
                SK: this.getSortKeyRevision(entry.version),
                TYPE: TYPE_ENTRY,
                GSI1_PK: this.getGSIEntryPartitionKey(model),
                GSI1_SK: this.getGSISortKey(storageEntry)
            }),
            this._entity.putBatch({
                ...storageEntry,
                PK: partitionKey,
                SK: this.getSortKeyLatest(),
                TYPE: TYPE_ENTRY_LATEST,
                GSI1_PK: this.getGSILatestPartitionKey(model),
                GSI1_SK: this.getGSISortKey(storageEntry)
            })
        ];

        try {
            await this._table.batchWrite(items);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not insert data into the DynamoDB.",
                ex.code || "CREATE_ENTRY_ERROR",
                {
                    error: ex,
                    entry
                }
            );
        }

        return storageEntry;
    }

    public async createRevisionFrom(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsCreateRevisionFromArgs
    ) {
        const { originalEntry, entry, storageEntry, latestEntry } = args;

        const partitionKey = this.getPartitionKey(storageEntry.id);
        /**
         * We need to:
         *  - create the main entry item
         *  - update the last entry item to a current one
         */
        const items = [
            this._entity.putBatch({
                ...storageEntry,
                PK: partitionKey,
                SK: this.getSortKeyRevision(storageEntry.version),
                TYPE: TYPE_ENTRY,
                GSI1_PK: this.getGSIEntryPartitionKey(model),
                GSI1_SK: this.getGSISortKey(storageEntry)
            }),
            this._entity.putBatch({
                ...storageEntry,
                PK: partitionKey,
                SK: this.getSortKeyLatest(),
                TYPE: TYPE_ENTRY_LATEST,
                GSI1_PK: this.getGSILatestPartitionKey(model),
                GSI1_SK: this.getGSISortKey(storageEntry)
            })
        ];
        try {
            await this._table.batchWrite(items);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not create revision from given entry.",
                ex.code || "CREATE_REVISION_ERROR",
                {
                    error: ex,
                    originalEntry,
                    latestEntry,
                    entry,
                    storageEntry
                }
            );
        }
        /**
         * There are no modifications on the entry created so just return the data.
         */
        return storageEntry;
    }

    public async delete(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsDeleteArgs
    ): Promise<void> {
        const { entry } = args;
        const partitionKey = this.getPartitionKey(entry.id);

        const results = await this._entity.query(partitionKey, {
            gte: " "
        });

        const keys = results.Items.map(item => ({
            PK: partitionKey,
            SK: item.SK
        }));
        try {
            await this._table.batchWrite(keys.map(key => this._entity.deleteBatch(key)));
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not delete the entry.",
                ex.code || "DELETE_ENTRY_ERROR",
                {
                    error: ex,
                    partitionKey,
                    keys
                }
            );
        }
    }

    public async deleteRevision(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsDeleteRevisionArgs
    ): Promise<void> {
        const { entryToDelete, entryToSetAsLatest, storageEntryToSetAsLatest } = args;
        const partitionKey = this.getPartitionKey(entryToDelete.id);

        const items = [
            this._entity.deleteBatch({
                PK: partitionKey,
                SK: this.getSortKeyRevision(entryToDelete.id)
            })
        ];

        const publishedStorageEntry = await this.getPublishedRevisionByEntryId(
            model,
            entryToDelete.id
        );

        /**
         * If revision we are deleting is the published one as well, we need to delete those records as well.
         */
        if (publishedStorageEntry && entryToDelete.id === publishedStorageEntry.id) {
            items.push(
                this._entity.deleteBatch({
                    PK: partitionKey,
                    SK: this.getSortKeyPublished()
                })
            );
        }
        if (storageEntryToSetAsLatest) {
            items.push(
                this._entity.putBatch({
                    ...storageEntryToSetAsLatest,
                    PK: partitionKey,
                    SK: this.getSortKeyLatest(),
                    TYPE: TYPE_ENTRY_LATEST,
                    GSI1_PK: this.getGSILatestPartitionKey(model),
                    GSI1_SK: this.getGSISortKey(storageEntryToSetAsLatest)
                })
            );
        }
        try {
            await this._table.batchWrite(items);
        } catch (ex) {
            throw new WebinyError(ex.message, ex.code, {
                error: ex,
                entryToDelete,
                entryToSetAsLatest
            });
        }
    }

    public async get(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsGetArgs
    ): Promise<CmsContentEntry | null> {
        const { items } = await this.list(model, {
            ...(args || {}),
            limit: 1
        });
        if (items.length === 0) {
            return null;
        }
        return items.shift();
    }

    public async list(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsListArgs
    ): Promise<CmsContentEntryStorageOperationsListResponse> {
        const { limit: initialLimit, where: originalWhere, after, sort } = args;
        /**
         * There is no max limit imposed because that is up to the devs using this.
         * Default is some reasonable number for us but users can set their own when initializing the plugin.
         */
        const defaultLimit = this.configuration.defaultLimit || configurationDefaults.defaultLimit;
        const maxLimit = this.configuration.maxLimit || defaultLimit;
        const limit =
            !initialLimit || initialLimit <= 0
                ? initialLimit > maxLimit
                    ? maxLimit
                    : defaultLimit
                : initialLimit;

        const items: CmsContentEntry[] = [];

        const queryOptions = this.createQueryOptions({
            where: originalWhere,
            model
        });

        try {
            /**
             * We run the query method on all the partition keys that were built in the createQueryOptions() method.
             * Partition keys are always built as array because of the possibility that we might need to read from different partitions
             * which is the case if where condition is something like id_in or entryId_in.
             * If we are reading from the GSI1_PK it is a single partition but we keep it as an array
             * just to make it easier to read in all of the cases.
             */
            for (const partitionKey of queryOptions.queryPartitionKeys) {
                const results = await this.runQuery({
                    partitionKey,
                    options: queryOptions.options
                });
                items.push(...results);
            }
        } catch (ex) {
            throw new WebinyError(ex.message, "SCAN_ERROR", {
                error: ex
            });
        }
        /**
         * We need a object containing field, transformers and paths.
         * Just build it here and pass on into other methods that require it to avoid mapping multiple times.
         */
        const modelFields = buildModelFields({
            context: this.context,
            model
        });
        /**
         * Filter the read items via the code.
         * It will build the filters out of the where input and transform the values it is using.
         */
        const filteredItems = await filterItems({
            items,
            where: queryOptions.where,
            context: this.context,
            model,
            fields: modelFields
        });

        const totalCount = filteredItems.length;
        /**
         * Sorting is also done via the code.
         * It takes the sort input and sorts by it via the lodash sortBy method.
         */
        const sortedItems = sortEntryItems({
            items: filteredItems,
            sort,
            fields: modelFields
        });

        const start = decodePaginationCursor(after) || 0;
        const hasMoreItems = totalCount > start + limit;
        const end = limit > totalCount + start + limit ? undefined : start + limit;
        const slicedItems = sortedItems.slice(start, end);
        /**
         * Although we do not need a cursor here, we will use it as such to keep it standardized.
         * Number is simply encoded.
         */
        const cursor = totalCount > start + limit ? encodePaginationCursor(start + limit) : null;
        return {
            hasMoreItems,
            totalCount,
            cursor,
            items: slicedItems
        };
    }
    public async update(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsUpdateArgs
    ): Promise<CmsContentEntry> {
        const { originalEntry, entry, storageEntry } = args;
        const partitionKey = this.getPartitionKey(originalEntry.id);

        const items = [];
        /**
         * We need to:
         *  - update the current entry
         *  - update the latest entry if the current entry is the latest one
         */
        items.push(
            this._entity.putBatch({
                ...storageEntry,
                PK: partitionKey,
                SK: this.getSortKeyRevision(storageEntry.version),
                TYPE: TYPE_ENTRY,
                GSI1_PK: this.getGSIEntryPartitionKey(model),
                GSI1_SK: this.getGSISortKey(storageEntry)
            })
        );

        /**
         * We need the latest entry to update it as well if neccessary.
         */
        const latestStorageEntry = await this.getLatestRevisionByEntryId(model, entry.id);

        if (latestStorageEntry && latestStorageEntry.id === entry.id) {
            items.push(
                this._entity.putBatch({
                    ...storageEntry,
                    PK: partitionKey,
                    SK: this.getSortKeyLatest(),
                    TYPE: TYPE_ENTRY_LATEST,
                    GSI1_PK: this.getGSILatestPartitionKey(model),
                    GSI1_SK: this.getGSISortKey(entry)
                })
            );
        }

        try {
            await this._table.batchWrite(items);
            return storageEntry;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not update entry.",
                ex.code || "UPDATE_ERROR",
                {
                    error: ex,
                    originalEntry,
                    entry,
                    latestStorageEntry
                }
            );
        }
    }

    public async publish(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsPublishArgs
    ): Promise<CmsContentEntry> {
        const { entry, storageEntry } = args;

        const partitionKey = this.getPartitionKey(entry.id);

        /**
         * We need the latest and published entries to see if something needs to be updated along side the publishing one.
         */
        const latestStorageEntry = await this.getLatestRevisionByEntryId(model, entry.id);
        const publishedStorageEntry = await this.getPublishedRevisionByEntryId(model, entry.id);
        /**
         * We need to update:
         *  - current entry revision sort key
         *  - published sort key
         *  - latest sort key - if entry updated is actually latest
         *  - previous published entry to unpublished status - if any previously published entry
         */
        const items = [
            this._entity.putBatch({
                ...storageEntry,
                PK: partitionKey,
                SK: this.getSortKeyRevision(entry.version),
                TYPE: TYPE_ENTRY,
                GSI1_PK: this.getGSIEntryPartitionKey(model),
                GSI1_SK: this.getGSISortKey(entry)
            }),
            this._entity.putBatch({
                ...storageEntry,
                PK: partitionKey,
                SK: this.getSortKeyPublished(),
                TYPE: TYPE_ENTRY_PUBLISHED,
                GSI1_PK: this.getGSIPublishedPartitionKey(model),
                GSI1_SK: this.getGSISortKey(entry)
            })
        ];
        if (entry.id === latestStorageEntry.id) {
            items.push(
                this._entity.putBatch({
                    ...storageEntry,
                    PK: partitionKey,
                    SK: this.getSortKeyLatest(),
                    TYPE: TYPE_ENTRY_LATEST,
                    GSI1_PK: this.getGSILatestPartitionKey(model),
                    GSI1_SK: this.getGSISortKey(entry)
                })
            );
        }
        if (publishedStorageEntry) {
            items.push(
                this._entity.putBatch({
                    ...publishedStorageEntry,
                    PK: partitionKey,
                    SK: this.getSortKeyRevision(publishedStorageEntry.version),
                    TYPE: TYPE_ENTRY,
                    status: CONTENT_ENTRY_STATUS.UNPUBLISHED,
                    GSI1_PK: this.getGSIEntryPartitionKey(model),
                    GSI1_SK: this.getGSISortKey(publishedStorageEntry)
                })
            );
        }

        try {
            await this._table.batchWrite(items);
            this._dataLoaders.clearAllEntryRevisions(model, entry);
            return entry;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not execute the publishing batch.",
                ex.code || "PUBLISH_ERROR",
                {
                    entry,
                    latestStorageEntry,
                    publishedStorageEntry
                }
            );
        }
    }

    public async unpublish(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsUnpublishArgs
    ): Promise<CmsContentEntry> {
        const { entry, storageEntry } = args;

        const partitionKey = this.getPartitionKey(entry.id);
        /**
         * We need to:
         *  - delete currently published entry
         *  - update current entry revision with new data
         *  - update latest entry status - if entry being unpublished is latest
         */
        const items = [
            this._entity.deleteBatch({
                PK: partitionKey,
                SK: this.getSortKeyPublished()
            }),
            this._entity.putBatch({
                ...storageEntry,
                PK: partitionKey,
                SK: this.getSortKeyRevision(entry.version),
                TYPE: TYPE_ENTRY,
                GSI1_PK: this.getGSIEntryPartitionKey(model),
                GSI1_SK: this.getGSISortKey(entry)
            })
        ];

        /**
         * We need the latest entry to see if something needs to be updated along side the unpublishing one.
         */
        const latestStorageEntry = await this.getLatestRevisionByEntryId(model, entry.id);

        if (entry.id === latestStorageEntry.id) {
            items.push(
                this._entity.putBatch({
                    ...storageEntry,
                    PK: partitionKey,
                    SK: this.getSortKeyLatest(),
                    TYPE: TYPE_ENTRY_LATEST,
                    GSI1_PK: this.getGSILatestPartitionKey(model),
                    GSI1_SK: this.getGSISortKey(entry)
                })
            );
        }

        try {
            await this._table.batchWrite(items);
            return storageEntry;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not execute unpublish batch.",
                ex.code || "UNPUBLISH_ERROR",
                {
                    entry,
                    storageEntry
                }
            );
        }
    }

    public async requestChanges(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsRequestChangesArgs
    ): Promise<CmsContentEntry> {
        const { entry, storageEntry, originalEntry } = args;

        const partitionKey = this.getPartitionKey(entry.id);

        /**
         * We need to:
         *  - update the existing entry
         *  - update latest version - if existing entry is the latest version
         */
        const items = [
            this._entity.putBatch({
                ...storageEntry,
                PK: partitionKey,
                SK: this.getSortKeyRevision(entry.version),
                GSI1_PK: this.getGSIEntryPartitionKey(model),
                GSI1_SK: this.getGSISortKey(entry)
            })
        ];

        /**
         * We need the latest entry to see if something needs to be updated along side the request changes one.
         */
        const latestStorageEntry = await this.getLatestRevisionByEntryId(model, entry.id);

        if (latestStorageEntry.id === entry.id) {
            items.push(
                this._entity.putBatch({
                    ...storageEntry,
                    PK: partitionKey,
                    SK: this.getSortKeyLatest(),
                    TYPE: TYPE_ENTRY_LATEST,
                    GSI1_PK: this.getGSILatestPartitionKey(model),
                    GSI1_SK: this.getGSISortKey(entry)
                })
            );
        }

        try {
            await this._table.batchWrite(items);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not execute the request changes batch.",
                ex.code || "REQUEST_CHANGES_ERROR",
                {
                    entry,
                    originalEntry
                }
            );
        }
        return entry;
    }

    public async requestReview(
        model: CmsContentModel,
        args: CmsContentEntryStorageOperationsRequestReviewArgs
    ): Promise<CmsContentEntry> {
        const { entry, storageEntry, originalEntry } = args;

        const partitionKey = this.getPartitionKey(entry.id);
        /**
         * We need to:
         *  - update existing entry
         *  - update latest entry - if existing entry is the latest entry
         */
        const items = [
            this._entity.putBatch({
                ...storageEntry,
                PK: partitionKey,
                SK: this.getSortKeyRevision(entry.version),
                GSI1_PK: this.getGSIEntryPartitionKey(model),
                GSI1_SK: this.getGSISortKey(entry)
            })
        ];

        /**
         * We need the latest entry to see if something needs to be updated along side the request review one.
         */
        const latestStorageEntry = await this.getLatestRevisionByEntryId(model, entry.id);

        if (latestStorageEntry.id === entry.id) {
            items.push(
                this._entity.putBatch({
                    ...storageEntry,
                    PK: partitionKey,
                    SK: this.getSortKeyLatest(),
                    TYPE: TYPE_ENTRY_LATEST,
                    GSI1_PK: this.getGSILatestPartitionKey(model),
                    GSI1_SK: this.getGSISortKey(entry)
                })
            );
        }

        try {
            await this._table.batchWrite(items);
            return entry;
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not execute request review batch.",
                ex.code || "REQUEST_REVIEW_ERROR",
                {
                    entry,
                    storageEntry,
                    originalEntry
                }
            );
        }
    }

    public async getAllRevisionsByIds(
        model: CmsContentModel,
        ids: readonly string[]
    ): Promise<CmsContentEntry[]> {
        if (ids.length === 0) {
            return [];
        }
        try {
            return await this._dataLoaders.getAllEntryRevisions(model, ids);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not read multiple entries.",
                ex.code || "GET_ALL_REVISIONS_BY_IDS_ERROR",
                {
                    ids
                }
            );
        }
    }

    public async getByIds(
        model: CmsContentModel,
        ids: readonly string[]
    ): Promise<CmsContentEntry[]> {
        if (ids.length === 0) {
            return [];
        }
        try {
            return await this._dataLoaders.getRevisionById(model, ids);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not read multiple entries.",
                ex.code || "GET_BY_IDS_ERROR",
                {
                    ids
                }
            );
        }
    }

    public async getPublishedByIds(
        model: CmsContentModel,
        ids: readonly string[]
    ): Promise<CmsContentEntry[]> {
        if (ids.length === 0) {
            return [];
        }
        try {
            return await this._dataLoaders.getPublishedRevisionByEntryId(model, ids);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not read multiple entries.",
                ex.code || "GET_BY_IDS_ERROR",
                {
                    ids
                }
            );
        }
    }

    public async getLatestByIds(
        model: CmsContentModel,
        ids: readonly string[]
    ): Promise<CmsContentEntry[]> {
        if (ids.length === 0) {
            return [];
        }
        try {
            return await this._dataLoaders.getLatestRevisionByEntryId(model, ids);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not read multiple entries.",
                ex.code || "GET_BY_IDS_ERROR",
                {
                    ids
                }
            );
        }
    }

    public async getRevisions(model: CmsContentModel, id: string): Promise<CmsContentEntry[]> {
        try {
            return await this._dataLoaders.getAllEntryRevisions(model, [id]);
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not read multiple entries.",
                ex.code || "GET_ALL_REVISIONS_BY_IDS_ERROR",
                {
                    id
                }
            );
        }
    }

    public async getRevisionById(
        model: CmsContentModel,
        id: string
    ): Promise<CmsContentEntry | null> {
        return this.getSingleDynamoDbItem({
            partitionKey: this.getPartitionKey(id),
            value: this.getSortKeyRevision(id)
        });
    }

    public async getPublishedRevisionByEntryId(
        model: CmsContentModel,
        entryId: string
    ): Promise<CmsContentEntry | null> {
        return this.getSingleDynamoDbItem({
            partitionKey: this.getPartitionKey(entryId),
            value: this.getSortKeyPublished()
        });
    }

    public async getLatestRevisionByEntryId(
        model: CmsContentModel,
        entryId: string
    ): Promise<CmsContentEntry | null> {
        return this.getSingleDynamoDbItem({
            partitionKey: this.getPartitionKey(entryId),
            value: this.getSortKeyLatest()
        });
    }

    public async getPreviousRevision(
        model: CmsContentModel,
        entryId: string,
        version: number
    ): Promise<CmsContentEntry | null> {
        const entry = await this.getSingleDynamoDbItem({
            partitionKey: this.getPartitionKey(entryId),
            op: "lt",
            value: this.getSortKeyRevision(version),
            order: "DESC"
        });
        if ((entry as any).TYPE !== TYPE_ENTRY) {
            return null;
        }
        return entry;
    }

    private async getSingleDynamoDbItem(
        args: GetSingleDynamoDBItemArgs
    ): Promise<CmsContentEntry | null> {
        const { partitionKey, op = "eq", value, order = "ASC" } = args;
        const queryOptions: DynamoDBToolboxQueryOptions = {
            [op]: value,
            reverse: order === "DESC",
            limit: 1
        };

        try {
            const result = await this._entity.query(partitionKey, queryOptions);
            if (!result || Array.isArray(result.Items) === false) {
                throw new WebinyError(
                    "Error when querying for content entries - no result.",
                    "QUERY_ERROR",
                    {
                        partitionKey,
                        queryOptions
                    }
                );
            }
            if (result.Items.length === 0) {
                return null;
            }
            return result.Items.shift();
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not read from the DynamoDB.",
                ex.code || "DDB_READ_ERROR",
                {
                    partitionKey,
                    queryOptions
                }
            );
        }
    }

    public getPartitionKey(id: string): string {
        /**
         * If ID includes # it means it is composed of ID and VERSION.
         * We need ID only so extract it.
         */
        if (id.match("#") !== null) {
            id = id.split("#").shift();
        }
        return `${this._partitionKey}#${id}`;
    }

    private getGSIPartitionKey(type: "L" | "P" | "A", model: CmsContentModel) {
        return `${this._partitionKey}#M#${model.modelId}#${type}`;
    }

    private getGSIEntryPartitionKey(model: CmsContentModel): string {
        return this.getGSIPartitionKey("A", model);
    }
    private getGSILatestPartitionKey(model: CmsContentModel): string {
        return this.getGSIPartitionKey("L", model);
    }

    private getGSIPublishedPartitionKey(model: CmsContentModel): string {
        return this.getGSIPartitionKey("P", model);
    }

    private getGSISortKey(entry: CmsContentEntry): string {
        return entry.id;
    }
    /**
     * Gets a secondary key in form of REV#version from:
     *   id#0003
     *   0003
     *   3
     */
    public getSortKeyRevision(version: string | number) {
        if (typeof version === "string" && version.includes("#") === true) {
            version = version.split("#").pop();
        }
        return `REV#${zeroPad(version)}`;
    }

    public getSortKeyLatest(): string {
        return "L";
    }

    public getSortKeyPublished(): string {
        return "P";
    }
    /**
     * Method to build the query partition keys, always an array, and create the target index:
     * - if undefined then it is primary
     * - if populated then it is that given one (and partition keys are reflecting that)
     */
    private createQueryOptions({
        where: originalWhere,
        model
    }: {
        where: CmsContentEntryListWhere;
        model: CmsContentModel;
    }): {
        queryPartitionKeys: string[];
        where: CmsContentEntryListWhere;
        options: DynamoDBToolboxQueryOptions;
    } {
        const options: DynamoDBToolboxQueryOptions = {
            filters: [],
            index: undefined
        };
        const where = lodashCloneDeep(originalWhere);
        /**
         * if we have id or entry ID, we will query via the primary key
         * just add all the possible IDs to find
         */
        const queryPartitionKeys: string[] = [];
        if (where.id) {
            queryPartitionKeys.push(this.getPartitionKey(where.id));
        }
        if (where.entryId) {
            queryPartitionKeys.push(this.getPartitionKey(where.entryId));
        }
        if (where.id_in) {
            queryPartitionKeys.push(...where.id_in.map(id => this.getPartitionKey(id)));
        }
        if (where.entryId_in) {
            queryPartitionKeys.push(...where.entryId_in.map(id => this.getPartitionKey(id)));
        }

        /**
         * If we do not have any of the IDs, we will query via the GSI1_PK just depending on the entry type
         * At this point there will probably be a lot of results
         * but we will apply some basic dynamodb filters so we dont get much data from the db
         * NOTE: It is still going to get charged tho
         */
        if (queryPartitionKeys.length === 0) {
            options.index = GSI1_INDEX;
            if (where.published) {
                queryPartitionKeys.push(this.getGSIPartitionKey("P", model));
            } else if (where.latest) {
                queryPartitionKeys.push(this.getGSIPartitionKey("L", model));
            } else {
                queryPartitionKeys.push(this.getGSIPartitionKey("A", model));
            }
        }
        /**
         * If index is the primary one, we can filter records by type (latest, published or regular)
         * so we do not need to filter in the code
         */
        if (!options.index) {
            if (where.published) {
                options.eq = this.getSortKeyPublished();
            } else if (where.latest) {
                options.eq = this.getSortKeyLatest();
            } else {
                options.beginsWith = "REV#";
            }
        }
        /**
         * we remove all the used where conditions
         */
        delete where["id"];
        delete where["id_in"];
        delete where["entryId"];
        delete where["entryId_in"];
        delete where["published"];
        delete where["latest"];
        return {
            options,
            queryPartitionKeys,
            where
        };
    }
    /**
     * A method to query the database at the given partition key with the built query options.
     * Method runs in the loop until it reads everything it needs to.
     * We could impose the limit on the records read but there is no point since we MUST read everything to be able
     * to filter and sort the data.
     */
    public async runQuery(args: RunQueryArgs): Promise<CmsContentEntry[]> {
        let previousResult = undefined;
        let results;
        const items: CmsContentEntry[] = [];
        while ((results = await this.query(previousResult, args))) {
            items.push(...results.Items);
            previousResult = results;
        }
        return items;
    }

    private async query(previousResult, args: RunQueryArgs) {
        const { partitionKey, options } = args;
        let result;
        /**
         * In case there is no previous result we must make a new query.
         * This is the first query on the given partition key.
         */
        if (!previousResult) {
            result = await this._entity.query(partitionKey, options);
        } else if (typeof previousResult.next === "function") {
            /**
             * In case we have a previous result and it has a next method, we run it.
             * In case result of the next method is false, it means it has nothing else to read
             * and we return a null to keep the query from repeating.
             */
            result = await previousResult.next();
            if (result === false) {
                return null;
            }
        } else {
            /**
             * This could probably never happen but keep it here just in case to break the query loop.
             * Basically, either previousResult does not exist or it exists and has a next method
             * and at that point a result returned will be null and loop should not start again.
             */
            return null;
        }
        /**
         * We expect the result to contain an Items array and if not, something went wrong, very wrong.
         */
        if (!result || !result.Items || !Array.isArray(result.Items)) {
            throw new WebinyError(
                "Error when querying for content entries - no result.",
                "QUERY_ERROR",
                {
                    partitionKey,
                    options
                }
            );
        }
        return result;
    }
}

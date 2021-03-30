import mdbid from "mdbid";
import { ContextPlugin } from "@webiny/handler/types";
import { NotFoundError } from "@webiny/handler-graphql";
import {
    CmsContentEntryContext,
    CmsContentEntryPermission,
    CmsContentEntry,
    CmsContentModel,
    CmsContext,
    CmsContentEntryStorageOperationsProvider
} from "../../../types";
import * as utils from "../../../utils";
import { validateModelEntryData } from "./contentEntry/entryDataValidation";
import {
    afterCreateHook,
    afterDeleteHook,
    afterDeleteRevisionHook,
    afterPublishHook,
    afterRequestChangesHook,
    afterRequestReviewHook,
    afterUpdateHook,
    afterUnpublishHook,
    beforeCreateHook,
    beforeDeleteHook,
    beforeDeleteRevisionHook,
    beforePublishHook,
    beforeRequestChangesHook,
    beforeRequestReviewHook,
    beforeUpdateHook,
    beforeUnpublishHook,
    beforeCreateRevisionFromHook,
    afterCreateRevisionFromHook
} from "./contentEntry/hooks";
import WebinyError from "@webiny/error";
import { entryFromStorageTransform } from "../utils/entryStorage";

export const STATUS_DRAFT = "draft";
export const STATUS_PUBLISHED = "published";
export const STATUS_UNPUBLISHED = "unpublished";
export const STATUS_CHANGES_REQUESTED = "changesRequested";
export const STATUS_REVIEW_REQUESTED = "reviewRequested";

const cleanInputData = (
    model: CmsContentModel,
    inputData: Record<string, any>
): Record<string, any> => {
    return model.fields.reduce((acc, field) => {
        acc[field.fieldId] = inputData[field.fieldId];
        return acc;
    }, {});
};

interface EntryIdResult {
    /**
     * A generated id that will connect all the entry records.
     */
    entryId: string;
    /**
     * Version of the entry.
     */
    version: number;
    /**
     * Combination of entryId and version.
     */
    id: string;
}
const createEntryId = (version: number): EntryIdResult => {
    const entryId = mdbid();
    return {
        entryId,
        version,
        id: `${entryId}#${utils.zeroPad(version)}`
    };
};

const increaseEntryIdVersion = (id: string): EntryIdResult => {
    if (id.includes("#") === false) {
        throw new WebinyError(
            "Cannot increase version on the ID without the version part.",
            "WRONG_ID",
            {
                id
            }
        );
    }
    const [entryId, version] = id.split("#");
    const ver = parseInt(version) + 1;
    return {
        entryId,
        version: ver,
        id: `${entryId}#${utils.zeroPad(ver)}`
    };
};

export default (): ContextPlugin<CmsContext> => ({
    type: "context",
    name: "context-content-model-entry",
    async apply(context) {
        const { security } = context;

        const pluginType = "cms-content-entry-storage-operations-provider";
        const providerPlugins = context.plugins.byType<CmsContentEntryStorageOperationsProvider>(
            pluginType
        );
        /**
         * Storage operations for the content entry.
         * Contains logic to save the data into the specific storage.
         */
        const providerPlugin = providerPlugins[providerPlugins.length - 1];
        if (!providerPlugin) {
            throw new WebinyError(`Missing "${pluginType}" plugin.`, "PLUGIN_NOT_FOUND", {
                type: pluginType
            });
        }

        const storageOperations = await providerPlugin.provide({
            context
        });

        // const PK_ENTRY = entryId => `${createCmsPK(context)}#CME#${entryId}`;
        // const SK_REVISION = version => {
        //     return typeof version === "string" ? `REV#${version}` : `REV#${utils.zeroPad(version)}`;
        // };
        // const SK_LATEST = () => "L";
        // const SK_PUBLISHED = () => "P";

        // const loaders = {
        //     getAllEntryRevisions: dataLoaders.getAllEntryRevisions(context, { PK_ENTRY }),
        //     getRevisionById: dataLoaders.getRevisionById(context, { PK_ENTRY }),
        //     getPublishedRevisionByEntryId: dataLoaders.getPublishedRevisionByEntryId(context, {
        //         PK_ENTRY,
        //         SK_PUBLISHED
        //     }),
        //     getLatestRevisionByEntryId: dataLoaders.getLatestRevisionByEntryId(context, {
        //         PK_ENTRY,
        //         SK_LATEST
        //     })
        // };

        const checkPermissions = (check: {
            rwd?: string;
            pw?: string;
        }): Promise<CmsContentEntryPermission> => {
            return utils.checkPermissions(context, "cms.contentEntry", check);
        };

        /**
         * A helper to delete the entire entry.
         */
        const deleteEntry = async (
            model: CmsContentModel,
            entry: CmsContentEntry
        ): Promise<void> => {
            try {
                await beforeDeleteHook({
                    context,
                    model,
                    entry,
                    storageOperations
                });
                await storageOperations.delete(model, {
                    entry
                });
                await afterDeleteHook({
                    context,
                    model,
                    entry,
                    storageOperations
                });
            } catch (ex) {
                throw new WebinyError(
                    ex.message || "Could not delete entry.",
                    ex.code || "DELETE_ERROR",
                    {
                        entry
                    }
                );
            }
        };

        const entries: CmsContentEntryContext = {
            operations: storageOperations,
            /**
             * Get entries by exact revision IDs from the database.
             */
            getByIds: async (model: CmsContentModel, ids: string[]) => {
                const permission = await checkPermissions({ rwd: "r" });
                utils.checkModelAccess(context, permission, model);

                // const { getRevisionById } = loaders;

                // const entries = (await getRevisionById.loadMany(ids)) as CmsContentEntry[];
                const entries = await storageOperations.getByIds(model, ids);

                return entries.filter(entry => utils.validateOwnership(context, permission, entry));
            },

            getById: async (model, id) => {
                const [entry] = await context.cms.entries.getByIds(model, [id]);
                if (!entry) {
                    throw new NotFoundError();
                }
                return entry;
            },
            /**
             * Get latest published revisions by entry IDs.
             */
            getPublishedByIds: async (model: CmsContentModel, ids: string[]) => {
                const permission = await checkPermissions({ rwd: "r" });
                utils.checkModelAccess(context, permission, model);
                // const { getPublishedRevisionByEntryId } = loaders;

                // We only need entry ID (not revision ID) to get published revision for that entry.
                // const entryIds = ids.map(id => id.split("#")[0]);
                //
                // const entries = (await getPublishedRevisionByEntryId.loadMany(
                //     entryIds
                // )) as CmsContentEntry[];
                const entries = await storageOperations.getPublishedByIds(model, ids);

                return entries.filter(entry => utils.validateOwnership(context, permission, entry));
            },
            /**
             * Get latest revisions by entry IDs.
             */
            getLatestByIds: async (model: CmsContentModel, ids: string[]) => {
                const permission = await checkPermissions({ rwd: "r" });
                utils.checkModelAccess(context, permission, model);
                // const { getLatestRevisionByEntryId } = loaders;

                // We only need entry ID (not revision ID) to get the latest revision for that entry.
                // const entryIds = ids.map(id => id.split("#")[0]);

                // const entries = (await getLatestRevisionByEntryId.loadMany(
                //     entryIds
                // )) as CmsContentEntry[];
                const entries = await storageOperations.getLatestByIds(model, ids);

                return entries.filter(entry => utils.validateOwnership(context, permission, entry));
            },

            getEntryRevisions: async (model, entryId) => {
                return storageOperations.getRevisions(model, entryId);
            },
            get: async (model, args) => {
                await checkPermissions({ rwd: "r" });

                const [items] = await context.cms.entries.list(model, {
                    ...args,
                    limit: 1
                });

                if (items.length === 0) {
                    throw new NotFoundError(`Entry not found!`);
                }
                return items[0];
            },
            list: async (model: CmsContentModel, args) => {
                const permission = await checkPermissions({ rwd: "r" });
                utils.checkModelAccess(context, permission, model);

                const { where = {} } = args || {};
                // Possibly only get records which are owned by current user
                // Or if searching for the owner set that value - in the case that user can see other entries than their own
                const ownedBy = permission.own ? context.security.getIdentity().id : where.ownedBy;

                const { hasMoreItems, totalCount, cursor, items } = await storageOperations.list(
                    model,
                    {
                        ...args,
                        where: {
                            ...where,
                            ownedBy
                        }
                    }
                );

                const meta = {
                    hasMoreItems,
                    totalCount,
                    cursor
                };

                return [items, meta];
            },
            listLatest: async function(model, args = {}) {
                return context.cms.entries.list(model, {
                    sort: ["createdOn_DESC"],
                    ...args,
                    where: {
                        ...(args.where || {}),
                        latest: true
                    }
                });
            },
            listPublished: async function(model, args = {}) {
                return context.cms.entries.list(model, {
                    sort: ["createdOn_DESC"],
                    ...args,
                    where: {
                        ...(args.where || {}),
                        published: true
                    }
                });
            },
            create: async (model, inputData) => {
                const permission = await checkPermissions({ rwd: "w" });
                utils.checkModelAccess(context, permission, model);

                // Make sure we only work with fields that are defined in the model.
                const input = cleanInputData(model, inputData);

                await validateModelEntryData(context, model, input);

                const identity = security.getIdentity();
                const locale = context.cms.getLocale();

                const owner = {
                    id: identity.id,
                    displayName: identity.displayName,
                    type: identity.type
                };

                const { id, entryId, version } = createEntryId(1);

                const data: CmsContentEntry = {
                    entryId,
                    id,
                    modelId: model.modelId,
                    locale: locale.code,
                    createdOn: new Date().toISOString(),
                    savedOn: new Date().toISOString(),
                    createdBy: owner,
                    ownedBy: owner,
                    version,
                    locked: false,
                    status: STATUS_DRAFT,
                    values: input
                };

                try {
                    await beforeCreateHook({ model, input, data, context, storageOperations });
                    const entryRevision = await storageOperations.create(model, {
                        input,
                        data
                    });
                    await afterCreateHook({
                        model,
                        input,
                        data,
                        entryRevision,
                        context,
                        storageOperations
                    });
                    return entryRevision;
                } catch (ex) {
                    throw new WebinyError(
                        ex.message || "Could not create content entry.",
                        ex.code || "CREATE_ENTRY_ERROR",
                        ex.data || {
                            error: ex,
                            input,
                            data
                        }
                    );
                }
            },
            createRevisionFrom: async (model, sourceId, data = {}) => {
                const permission = await checkPermissions({ rwd: "w" });
                utils.checkModelAccess(context, permission, model);

                // Entries are identified by a common parent ID + Revision number
                const [uniqueId] = sourceId.split("#");

                const originalStorageEntry = await storageOperations.getRevisionById(
                    model,
                    sourceId
                );
                const latestStorageEntry = await storageOperations.getLatestRevisionByEntryId(
                    model,
                    uniqueId
                );

                // const [
                //     originalStorageEntry,
                //     latestStorageEntry
                // ] = await storageOperations.get/Multiple(model, [
                //     {
                //         where: {
                //             id: sourceId
                //         }
                //     },
                //     {
                //         where: {
                //             entryId: uniqueId,
                //             latest: true
                //         }
                //     }
                // ]);

                // const [uniqueId, version] = sourceId.split("#");
                // const originalEntry = await context.cms.entries.get(model, {
                //     where: {
                //         id: sourceId
                //     }
                // });

                if (!originalStorageEntry) {
                    throw new NotFoundError(
                        `Entry "${sourceId}" of model "${model.modelId}" was not found.`
                    );
                }

                // We need to convert data from DB to its original form before constructing ES index data.
                const originalEntryRevision = await entryFromStorageTransform(
                    context,
                    model,
                    originalStorageEntry
                );

                const latestEntryRevision = latestStorageEntry
                    ? await entryFromStorageTransform(context, model, latestStorageEntry)
                    : null;

                // const [latestEntryItems] = await context.cms.entries.listLatest(model, {
                //     where: {
                //         id: sourceId,
                //     }
                // });
                // const [latestEntry] = latestEntryItems;
                utils.checkOwnership(context, permission, originalEntryRevision, "ownedBy");

                // const [[[entry]], [[latestEntry]]] = await db
                //     .batch()
                //     .read({
                //         ...utils.defaults.db(),
                //         query: {PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version)}
                //     })
                //     .read({
                //         ...utils.defaults.db(),
                //         query: {PK: PK_ENTRY(uniqueId), SK: SK_LATEST()}
                //     })
                //     .execute();

                // We need to convert data from DB to its original form before constructing ES index data.
                // const originalEntryFromStorage = await entryFromStorageTransform(context, model, originalStorageEntry);

                const identity = security.getIdentity();
                // const nextVersion = parseInt(latestEntry.version as any) + 1;
                // const id = `${uniqueId}#${utils.zeroPad(nextVersion)}`;
                const { id, version: nextVersion } = increaseEntryIdVersion(
                    latestEntryRevision ? latestEntryRevision.id : sourceId
                );

                // const storageEntry = await entryToStorageTransform(context, model, ({
                //     values: data || {}
                // } as unknown) as CmsContentEntry);

                const entry: CmsContentEntry = {
                    ...originalEntryRevision,
                    id,
                    version: nextVersion,
                    savedOn: new Date().toISOString(),
                    createdOn: new Date().toISOString(),
                    createdBy: {
                        id: identity.id,
                        displayName: identity.displayName,
                        type: identity.type
                    },
                    locked: false,
                    publishedOn: null,
                    status: STATUS_DRAFT,
                    values: {
                        ...originalEntryRevision.values,
                        ...data
                    }
                };

                try {
                    await beforeCreateRevisionFromHook({
                        context,
                        model,
                        data: entry,
                        originalEntryRevision,
                        latestEntryRevision,
                        storageOperations
                    });
                    const result = await storageOperations.createRevisionFrom(model, {
                        data: entry,
                        originalEntryRevision,
                        latestEntryRevision
                    });
                    await afterCreateRevisionFromHook({
                        context,
                        model,
                        originalEntryRevision,
                        latestEntryRevision,
                        data: entry,
                        entry: result,
                        storageOperations
                    });
                    return result;
                } catch (ex) {
                    throw new WebinyError(
                        ex.message || "Could not create entry from existing one.",
                        ex.code || "CREATE_FROM_REVISION_ERROR",
                        {
                            error: ex,
                            entry,
                            originalEntryRevision,
                            latestEntryRevision
                        }
                    );
                }

                /*
                const esEntry = prepareEntryToIndex({
                    context,
                    model,
                    originalEntry: cloneDeep(originalEntry),
                    storageEntry: cloneDeep(entry)
                });
                
                const {index: esIndex} = utils.defaults.es(context, model);
                
                await db
                    .batch()
                    // Create main entry item
                    .create({
                        ...utils.defaults.db(),
                        data: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_REVISION(utils.zeroPad(nextVersion)),
                            TYPE: TYPE_ENTRY,
                            ...entry
                        }
                    })
                    // Update "latest" entry item
                    .update({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST()
                        },
                        data: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST(),
                            TYPE: TYPE_ENTRY_LATEST,
                            ...entry
                        }
                    })
                    .update({
                        ...utils.defaults.esDb(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST()
                        },
                        data: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST(),
                            index: esIndex,
                            data: getESLatestEntryData(context, esEntry)
                        }
                    })
                    .execute();
                

                
                return entry;
                */
            },
            update: async (model, id, inputData) => {
                const permission = await checkPermissions({ rwd: "w" });
                utils.checkModelAccess(context, permission, model);

                // Make sure we only work with fields that are defined in the model.
                const input = cleanInputData(model, inputData);

                // Validate data early. We don't want to query DB if input data is invalid.
                await validateModelEntryData(context, model, input);

                // Now we know the data is valid, proceed with DB calls.
                const [entryId] = id.split("#");

                const originalStorageEntry = await storageOperations.getRevisionById(model, id);
                const latestOriginalStorageEntry = await storageOperations.getLatestRevisionByEntryId(
                    model,
                    entryId
                );

                // const [
                //     originalStorageEntry,
                //     latestOriginalStorageEntry
                // ] = await storageOperations.get/Multiple(model, [
                //     {
                //         where: {
                //             id: uniqueId,
                //             version: parseInt(version)
                //         }
                //     },
                //     {
                //         where: {
                //             id: uniqueId,
                //             latest: true
                //         }
                //     }
                // ]);
                const originalEntryRevision = await entryFromStorageTransform(
                    context,
                    model,
                    originalStorageEntry
                );
                const latestOriginalEntryRevision = latestOriginalStorageEntry
                    ? await entryFromStorageTransform(context, model, latestOriginalStorageEntry)
                    : null;
                /*
                const [[[entry]], [[latestOriginalEntry]]] = await db
                    .batch()
                    .read({
                        ...utils.defaults.db(),
                        query: {PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version)}
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: {PK: PK_ENTRY(uniqueId), SK: SK_LATEST()}
                    })
                    .execute();
                */

                if (!originalEntryRevision) {
                    throw new NotFoundError(
                        `Entry "${id}" of model "${model.modelId}" was not found.`
                    );
                }

                if (originalEntryRevision.locked) {
                    throw new WebinyError(
                        `Cannot update entry because it's locked.`,
                        "CONTENT_ENTRY_UPDATE_ERROR"
                    );
                }

                utils.checkOwnership(context, permission, originalEntryRevision, "ownedBy");

                /*
                const preparedForStorageEntry = await entryToStorageTransform(context, model, ({
                    values: input || {}
                } as unknown) as CmsContentEntry);
                
                */
                // we always send the full entry to the hooks and updater
                const updatedEntry: CmsContentEntry = {
                    ...originalEntryRevision,
                    savedOn: new Date().toISOString(),
                    values: {
                        // Values from DB
                        ...originalEntryRevision.values,
                        // New values
                        ...input
                    }
                };
                /*
                // we need full entry because of "before/after save" hooks
                const updatedEntry: CmsContentEntry = {
                    ...originalEntry,
                    savedOn: new Date().toISOString(),
                    values: {
                        // Values from DB
                        ...originalEntry.values,
                        // New values
                        ...input
                    }
                };
                
                const updatedStorageEntry = {
                    ...updatedEntry,
                    values: {
                        ...updatedEntry.values,
                        // Transformed values
                        ...preparedForStorageEntry.values
                    }
                };
                
                await beforeUpdateHook({model, entry: updatedEntry, context, storageOperations});
                
                const batch = db.batch();
                batch.update({
                    ...utils.defaults.db(),
                    query: {PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version)},
                    data: updatedStorageEntry
                });
                
                if(latestOriginalEntry.id === id) {
                    // We need to convert data from DB to its original form before constructing ES index data.
                    const originalEntry = await entryFromStorageTransform(context, model, originalEntry);
                    // and then prepare the entry for indexing
                    const esEntry = prepareEntryToIndex({
                        context,
                        model,
                        originalEntry: cloneDeep(originalEntry),
                        storageEntry: cloneDeep(updatedStorageEntry)
                    });
                    const esDoc = {
                        ...esEntry,
                        savedOn: updatedStorageEntry.savedOn
                    };
                    
                    const {index: esIndex} = utils.defaults.es(context, model);
                    
                    batch.update({
                        ...utils.defaults.esDb(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST()
                        },
                        data: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST(),
                            index: esIndex,
                            data: omit(getESLatestEntryData(context, esDoc), ["PK", "SK", "TYPE"])
                        }
                    });
                }
                
                await batch.execute();
                
                await afterUpdateHook({model, entry: updatedEntry, context, storageOperations});
                
                */

                try {
                    await beforeUpdateHook({
                        context,
                        model,
                        input,
                        data: updatedEntry,
                        originalEntryRevision,
                        latestEntryRevision: latestOriginalEntryRevision,
                        storageOperations
                    });

                    const entry = await storageOperations.update(model, {
                        originalEntryRevision,
                        latestEntryRevision: latestOriginalEntryRevision,
                        data: updatedEntry,
                        input
                    });
                    await afterUpdateHook({
                        context,
                        model,
                        input,
                        data: updatedEntry,
                        entry,
                        originalEntryRevision,
                        latestEntryRevision: latestOriginalEntryRevision,
                        storageOperations
                    });
                    return entry;
                } catch (ex) {
                    throw new WebinyError(
                        ex.message || "Could not update existing entry.",
                        ex.code || "UPDATE_ERROR",
                        {
                            error: ex,
                            data: updatedEntry,
                            originalEntryRevision,
                            latestEntry: latestOriginalEntryRevision,
                            input
                        }
                    );
                }
            },
            deleteRevision: async (model, revisionId) => {
                const permission = await checkPermissions({ rwd: "d" });
                utils.checkModelAccess(context, permission, model);

                const [entryId, version] = revisionId.split("#");

                // const [[prevLatestEntry]] = await db.read({
                //     ...utils.defaults.db(),
                //     query: {
                //         PK: "T#root#L#en-US#CMS#CMG#CME#6058e24dfb3cd802f957b7d1",
                //         SK: { $lt: "REV#0003" }
                //     },
                //     // Sorting in descending order will also make sure we only get items starting with REV#
                //     sort: { SK: -1 },
                //     limit: 1
                // });
                // const x = prevLatestEntry;

                // const items = await storageOperations.get/Multiple(model, [
                //     {
                //         where: {
                //             id: revisionId,
                //         },
                //         limit: 1,
                //     },
                //     {
                //         where: {
                //             entryId: uniqueId,
                //             latest: true
                //         },
                //         limit: 1,
                //     },
                //     {
                //         where: {
                //             entryId: uniqueId,
                //             published: true
                //         },
                //         limit: 1,
                //     },
                //     {
                //         where: {
                //             entryId: uniqueId,
                //             version_lt: parseInt(version),
                //         },
                //         sort: ["createdOn_DESC"],
                //         limit: 1,
                //     }
                // ]);

                const entryRevisionToDelete = await storageOperations.getRevisionById(
                    model,
                    revisionId
                );
                const latestEntryRevision = await storageOperations.getLatestRevisionByEntryId(
                    model,
                    entryId
                );
                const publishedEntryRevision = await storageOperations.getPublishedRevisionByEntryId(
                    model,
                    entryId
                );
                const previousEntryRevision = await storageOperations.getPreviousRevision(
                    model,
                    entryId,
                    parseInt(version)
                );

                // const [
                //     entry,
                //     latestEntry,
                //     publishedEntry,
                //     previousEntry
                // ] = await Promise.all<CmsContentEntry | null>(
                //     items.map(item =>
                //         item
                //             ? entryFromStorageTransform(context, model, item)
                //             : Promise.resolve(null)
                //     )
                // );

                // const [[[entry]], [[latestEntry]], [[publishedEntryData]]] = await db
                //     .batch()
                //     .read({
                //         ...utils.defaults.db(),
                //         query: {
                //             PK: PK_ENTRY(uniqueId),
                //             SK: SK_REVISION(version)
                //         }
                //     })
                //     .read({
                //         ...utils.defaults.db(),
                //         query: {
                //             PK: PK_ENTRY(uniqueId),
                //             SK: SK_LATEST()
                //         }
                //     })
                //     .read({
                //         ...utils.defaults.db(),
                //         query: {
                //             PK: PK_ENTRY(uniqueId),
                //             SK: SK_PUBLISHED()
                //         }
                //     })
                //     .execute();

                if (!entryRevisionToDelete) {
                    throw new NotFoundError(`Entry "${revisionId}" was not found!`);
                }

                utils.checkOwnership(context, permission, entryRevisionToDelete, "ownedBy");

                // const isLatest = latestEntry?.id === revisionId;
                // const isPublished = publishedEntry?.id === revisionId;

                // if is latest read previous entry
                // const previousEntry = await storageOperations.get(model, {
                //     where: {
                //         id: uniqueId,
                //         version_lt: parseInt(version)
                //     },
                //     sort: ["createdOn_DESC"]
                // });
                /*
                // BATCH 1 delete revision from the database
                const deleteArgsList: any[] = [
                    {
                        where: {
                            id: uniqueId,
                            version,
                        },
                    },
                ];
                // BATCH 1 if published - delete published key
                if (isPublished) {
                    deleteArgsList.push({
                        where: {
                            id: uniqueId,
                            published: true,
                        }
                    })
                }
                // BATCH 1 execute?
                await storageOperations.deleteMultiple(model, deleteArgsList);
                
                // if is latest read previous entry
                const previousEntry = await storageOperations.get(model, {
                    where: {
                        id: uniqueId,
                        version_lt: parseInt(version),
                    },
                    sort: [
                        "createdOn_DESC",
                    ]
                });
                // if no previous entry, just call delete - no need for BATCH
                if (!previousEntry) {
                
                }
                
                // BATCH 2 insert new latest
                
                await beforeDeleteRevisionHook({
                    context,
                    model,
                    storageOperations,
                    publishedEntry,
                    latestEntry,
                    entry,
                });
                
                // Delete revision from DB
                const batch = db.batch().delete({
                    ...utils.defaults.db(),
                    query: {
                        PK: PK_ENTRY(uniqueId),
                        SK: SK_REVISION(version)
                    }
                });
                
                const es = utils.defaults.es(context, model);
                

                
                // If the entry is published, remove published data, both from DB and ES.
                if(isPublished) {
                    batch.delete(
                        {
                            ...utils.defaults.db(),
                            query: {
                                PK: PK_ENTRY(uniqueId),
                                SK: SK_PUBLISHED()
                            }
                        },
                        {
                            ...utils.defaults.esDb(),
                            query: {
                                PK: PK_ENTRY(uniqueId),
                                SK: SK_PUBLISHED()
                            }
                        }
                    );
                }
                
                // If the entry is "latest", set the previous entry as the new latest.
                // Updates must be made on both DB and ES side.
                if(isLatest) {
                    const [[prevLatestEntry]] = await db.read<DbItem<CmsContentEntry>>({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: {$lt: SK_REVISION(version)}
                        },
                        // Sorting in descending order will also make sure we only get items starting with REV#
                        sort: {SK: -1},
                        limit: 1
                    });
                    
                    if(!prevLatestEntry) {
                        // If we haven't found the previous revision, this must must be the last revision.
                        // We can safely call `deleteEntry` to remove the whole entry and all of the related data.
                        const result = entries.deleteEntry(model, uniqueId);
                        // need to call lifecycle hook because we are ending the execution of this fn here
                        await afterDeleteRevisionHook({
                            context,
                            model,
                            entry, storageOperations
                        });
                        //
                        return result;
                    }
                    
                    // Update latest entry data.
                    batch
                        .update({
                            ...utils.defaults.db(),
                            query: {
                                PK: PK_ENTRY(uniqueId),
                                SK: SK_LATEST()
                            },
                            data: {
                                ...latestEntry,
                                ...omit(prevLatestEntry, ["PK", "SK", "TYPE"])
                            }
                        })
                        .update({
                            ...utils.defaults.esDb(),
                            query: {
                                PK: PK_ENTRY(uniqueId),
                                SK: SK_LATEST()
                            },
                            data: {
                                PK: PK_ENTRY(uniqueId),
                                SK: SK_LATEST(),
                                index: es.index,
                                data: getESLatestEntryData(context, prevLatestEntry)
                            }
                        });
                }
                
                // Execute DB operations
                await batch.execute();
                
                
                // operations
                deleteRevision entryRevisionToDelete
                if is latest entryRevisionToDelete
                    if previousEntryRevision
                        set latest previousEntryRevision
                if entryRevisionToDelete is published
                    set published previousEntryrevision
                */
                /**
                 * If targeted record is the latest entry record and there is no previous one, we need to run full delete with hooks.
                 * At this point deleteEntry hooks are not fired.
                 * TODO determine if not running the deleteRevision hooks is ok.
                 */
                if (
                    entryRevisionToDelete.id === latestEntryRevision?.id &&
                    !previousEntryRevision
                ) {
                    return await deleteEntry(model, entryRevisionToDelete);
                }
                /**
                 * If targeted record is latest entry revision, set the previous one as the new latest
                 */
                const entryRevisionToSetAsLatest =
                    entryRevisionToDelete.id === latestEntryRevision?.id
                        ? previousEntryRevision
                        : null;
                // const isPublished = entryRevisionToDelete.id === publishedEntryRevision?.id;

                try {
                    await beforeDeleteRevisionHook({
                        context,
                        model,
                        storageOperations,
                        entryRevisionToDelete,
                        entryRevisionToSetAsLatest
                    });
                    await storageOperations.deleteRevision(model, {
                        entryRevisionToDelete,
                        entryRevisionToSetAsLatest,
                        publishedEntryRevision,
                        latestEntryRevision
                    });
                    /*
                    // we always unpublish if necessary
                    if (isPublished) {
                        await storageOperations.unpublishRevision(model, entryRevisionToDelete);
                    }
                    // then we delete the actual revision
                    await storageOperations.deleteRevision(model, entryRevisionToDelete);
                    // and then set latest if there is one to be set
                    if (entryRevisionToSetAsLatest) {
                        await storageOperations.setRevisionAsLatest(
                            model,
                            entryRevisionToSetAsLatest
                        );
                    }
                    */
                    await afterDeleteRevisionHook({
                        context,
                        model,
                        storageOperations,
                        deletedEntryRevision: entryRevisionToDelete,
                        latestEntryRevision: entryRevisionToSetAsLatest
                    });
                } catch (ex) {
                    throw new WebinyError(ex.message, ex.code || "DELETE_REVISION_ERROR", {
                        error: ex,
                        deletedEntryRevision: entryRevisionToDelete,
                        latestEntryRevision: entryRevisionToSetAsLatest
                    });
                }
            },
            deleteEntry: async (model, entryId) => {
                const permission = await checkPermissions({ rwd: "d" });
                utils.checkModelAccess(context, permission, model);

                const { items } = await storageOperations.list(model, {
                    where: {
                        entryId
                    },
                    limit: 1
                });
                const entryRevision = items.length > 0 ? items.shift() : null;
                if (!entryRevision) {
                    throw new NotFoundError("Entry not found!");
                }

                utils.checkOwnership(context, permission, entryRevision, "ownedBy");
                /*
                
                if(!dbItems.length) {
                    throw new NotFoundError(`Entry "${entryId}" was not found!`);
                }
                
                utils.checkOwnership(context, permission, entries[0], "ownedBy");
                
                // need last entry from the items for hooks
                const entry = dbItems[dbItems.length - 1];
                
                // Load ES entries to delete
                const [esDbItems] = await db.read({
                    ...utils.defaults.esDb(),
                    query: {
                        PK: PK_ENTRY(entryId),
                        SK: {$gte: " "}
                    }
                });
                
                // Delete all items from DB and ES DB
                await Promise.all([
                    utils.paginateBatch(dbItems, 25, async items => {
                        await db
                            .batch()
                            .delete(
                                ...items.map((item: any) => ({
                                    ...utils.defaults.db(),
                                    query: {
                                        PK: item.PK,
                                        SK: item.SK
                                    }
                                }))
                            )
                            .execute();
                    }),
                    utils.paginateBatch(esDbItems, 25, async items => {
                        await db
                            .batch()
                            .delete(
                                ...items.map((item: any) => ({
                                    ...utils.defaults.esDb(),
                                    query: {
                                        PK: item.PK,
                                        SK: item.SK
                                    }
                                }))
                            )
                            .execute();
                    })
                ]);
                */
                return await deleteEntry(model, entryRevision);
            },
            publish: async (model, id) => {
                const permission = await checkPermissions({ pw: "p" });
                utils.checkModelAccess(context, permission, model);

                const [uniqueId] = id.split("#");

                const originalEntryRevision = await storageOperations.getRevisionById(model, id);
                const latestEntryRevision = await storageOperations.getLatestRevisionByEntryId(
                    model,
                    uniqueId
                );
                const publishedEntryRevision = await storageOperations.getPublishedRevisionByEntryId(
                    model,
                    uniqueId
                );
                // const [
                //     originalEntry,
                //     latestEntry,
                //     publishedEntry
                // ] = await storageOperations.get/Multiple(model, [
                //     {
                //         where: {
                //             id: uniqueId,
                //             version: parseInt(version)
                //         }
                //     },
                //     {
                //         where: {
                //             id: uniqueId,
                //             latest: true
                //         }
                //     },
                //     {
                //         where: {
                //             id: uniqueId,
                //             published: true
                //         }
                //     }
                // ]);

                if (!originalEntryRevision) {
                    throw new NotFoundError(
                        `Entry "${id}" of model "${model.modelId}" was not found.`
                    );
                }

                utils.checkOwnership(context, permission, originalEntryRevision, "ownedBy");

                const entry: CmsContentEntry = {
                    ...originalEntryRevision,
                    status: STATUS_PUBLISHED,
                    locked: true,
                    savedOn: new Date().toISOString(),
                    publishedOn: new Date().toISOString()
                };

                try {
                    await beforePublishHook({
                        context,
                        storageOperations,
                        model,
                        originalEntryRevision,
                        entry,
                        latestEntryRevision,
                        publishedEntryRevision
                    });
                    const newPublishedEntry = await storageOperations.publish(model, {
                        entry,
                        originalEntryRevision,
                        latestEntryRevision,
                        publishedEntryRevision
                    });
                    await afterPublishHook({
                        context,
                        storageOperations,
                        model,
                        originalEntryRevision,
                        entry: newPublishedEntry,
                        latestEntryRevision,
                        publishedEntryRevision
                    });
                    return newPublishedEntry;
                } catch (ex) {
                    throw new WebinyError(
                        ex.message || "Could not publish entry.",
                        ex.code || "PUBLISH_ERROR",
                        {
                            entry,
                            latestEntryRevision,
                            publishedEntryRevision
                        }
                    );
                }
                /*
                const ENTRY_PK = PK_ENTRY(uniqueId);
                const LATEST_SK = SK_LATEST();
                const PUBLISHED_SK = SK_PUBLISHED();
                
                const [
                    [[entry]],
                    [[latestEntryData]],
                    [[publishedEntryData]],
                    [[latestESData]],
                    [[publishedESData]]
                ] = await db
                    .batch()
                    .read({
                        ...utils.defaults.db(),
                        query: {PK: ENTRY_PK, SK: SK_REVISION(version)}
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: {PK: ENTRY_PK, SK: LATEST_SK}
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: {PK: ENTRY_PK, SK: PUBLISHED_SK}
                    })
                    .read({
                        ...utils.defaults.esDb(),
                        query: {PK: ENTRY_PK, SK: LATEST_SK}
                    })
                    .read({
                        ...utils.defaults.esDb(),
                        query: {PK: ENTRY_PK, SK: PUBLISHED_SK}
                    })
                    .execute();
                
                const batch = db.batch();
                
                batch.update({
                    ...utils.defaults.db(),
                    query: {
                        PK: ENTRY_PK,
                        SK: SK_REVISION(version)
                    },
                    data: entry
                });
                
                const es = utils.defaults.es(context, model);
                
                if(publishedEntryData) {
                    // If there is a `published` entry already, we need to set it to `unpublished`. We need to
                    // execute two updates: update the previously published entry's status and the published
                    // entry record (PK_ENTRY_PUBLISHED()).
                    
                    // DynamoDB does not support `batchUpdate` - so here we load the previously published
                    // entry's data to update its status within a batch operation. If, hopefully,
                    // they introduce a true update batch operation, remove this `read` call.
                    
                    const [[previouslyPublishedEntry]] = await db.read<CmsContentEntry>({
                        ...utils.defaults.db(),
                        query: {
                            PK: ENTRY_PK,
                            SK: SK_REVISION(utils.zeroPad(publishedEntryData.version))
                        }
                    });
                    
                    previouslyPublishedEntry.status = STATUS_UNPUBLISHED;
                    
                    batch
                        .update({
                            // Update currently published entry (unpublish it)
                            ...utils.defaults.db(),
                            query: {
                                PK: ENTRY_PK,
                                SK: SK_REVISION(utils.zeroPad(publishedEntryData.version))
                            },
                            data: previouslyPublishedEntry
                        })
                        .update({
                            // Update the helper item in DB with the new published entry ID
                            ...utils.defaults.db(),
                            query: {
                                PK: ENTRY_PK,
                                SK: PUBLISHED_SK
                            },
                            data: {
                                PK: ENTRY_PK,
                                SK: PUBLISHED_SK,
                                ...publishedEntryData,
                                ...omit(entry, ["PK", "SK", "TYPE"])
                            }
                        });
                }
                else {
                    batch.create({
                        ...utils.defaults.db(),
                        data: {
                            PK: ENTRY_PK,
                            SK: PUBLISHED_SK,
                            TYPE: TYPE_ENTRY_PUBLISHED,
                            ...omit(entry, ["PK", "SK", "TYPE"])
                        }
                    });
                }
                
                // If we are publishing the latest revision, let's also update the latest revision's status in ES.
                if(latestEntryData && latestEntryData.id === id) {
                    batch.update({
                        ...utils.defaults.esDb(),
                        query: {
                            PK: ENTRY_PK,
                            SK: LATEST_SK
                        },
                        data: {
                            ...latestESData,
                            data: {
                                ...latestESData.data,
                                status: STATUS_PUBLISHED,
                                locked: true,
                                publishedOn: entry.publishedOn
                            }
                        }
                    });
                }
                const originalEntry = await entryFromStorageTransform(context, model, entry);
                const preparedEntry = prepareEntryToIndex({
                    context,
                    model,
                    originalEntry: cloneDeep(originalEntry),
                    storageEntry: cloneDeep(entry)
                });
                
                // Update the published revision entry in ES.
                const esData = {
                    PK: ENTRY_PK,
                    SK: PUBLISHED_SK,
                    index: es.index,
                    data: getESPublishedEntryData(context, preparedEntry)
                };
                
                if(publishedESData) {
                    batch.update({
                        ...utils.defaults.esDb(),
                        query: {
                            PK: ENTRY_PK,
                            SK: PUBLISHED_SK
                        },
                        data: esData
                    });
                }
                else {
                    batch.create({
                        ...utils.defaults.esDb(),
                        data: esData
                    });
                }
                
                // Finally, execute batch
                await batch.execute();
                
                // Clear DataLoader cache for this entry.
                loaders.getAllEntryRevisions.clear(uniqueId);
                
                await afterPublishHook({
                    context,
                    model,
                    entry, storageOperations
                });
                
                return entry;
                */
            },
            requestChanges: async (model, id) => {
                const permission = await checkPermissions({ pw: "c" });
                const [entryId] = id.split("#");

                const originalEntryRevision = await storageOperations.getRevisionById(model, id);
                const latestEntryRevision = await storageOperations.getLatestRevisionByEntryId(
                    model,
                    entryId
                );
                // const [
                //     originalEntryRevision,
                //     latestEntryRevision
                // ] = await storageOperations.get/Multiple(model, [
                //     {
                //         where: {
                //             id: uniqueId,
                //             version: parseInt(version)
                //         }
                //     },
                //     {
                //         where: {
                //             id: uniqueId,
                //             latest: true
                //         }
                //     }
                // ]);

                if (!originalEntryRevision) {
                    throw new NotFoundError(
                        `Entry "${id}" of model "${model.modelId}" was not found.`
                    );
                }

                if (originalEntryRevision.status !== STATUS_REVIEW_REQUESTED) {
                    throw new WebinyError(
                        "Cannot request changes on an entry that's not under review.",
                        "ENTRY_NOT_UNDER_REVIEW"
                    );
                }

                const identity = context.security.getIdentity();
                if (originalEntryRevision.ownedBy.id === identity.id) {
                    throw new WebinyError(
                        "You cannot request changes on your own entry.",
                        "CANNOT_REQUEST_CHANGES_ON_OWN_ENTRY"
                    );
                }

                utils.checkOwnership(context, permission, originalEntryRevision, "ownedBy");

                const entry: CmsContentEntry = {
                    ...originalEntryRevision,
                    status: STATUS_CHANGES_REQUESTED,
                    locked: false
                };

                try {
                    await beforeRequestChangesHook({
                        context,
                        model,
                        originalEntryRevision,
                        latestEntryRevision,
                        entry,
                        storageOperations
                    });
                    const updatedRequestChangesEntry = await storageOperations.requestChanges(
                        model,
                        {
                            originalEntryRevision,
                            latestEntryRevision,
                            entry
                        }
                    );
                    await afterRequestChangesHook({
                        context,
                        model,
                        originalEntryRevision,
                        latestEntryRevision,
                        entry: updatedRequestChangesEntry,
                        storageOperations
                    });
                    return updatedRequestChangesEntry;
                } catch (ex) {
                    throw new WebinyError(
                        ex.message || "Could not request changes for the entry.",
                        ex.code || "REQUEST_CHANGES_ERROR",
                        {
                            entry,
                            originalEntry: originalEntryRevision
                        }
                    );
                }
            },
            requestReview: async (model, id) => {
                const permission = await checkPermissions({ pw: "r" });
                const [entryId] = id.split("#");

                const originalEntryRevision = await storageOperations.getRevisionById(model, id);
                const latestEntryRevision = await storageOperations.getLatestRevisionByEntryId(
                    model,
                    entryId
                );

                // const [
                //     originalEntryRevision,
                //     latestEntryRevision
                // ] = await storageOperations.get/Multiple(model, [
                //     {
                //         where: {
                //             id: uniqueId,
                //             version: parseInt(version)
                //         }
                //     },
                //     {
                //         where: {
                //             id: uniqueId,
                //             latest: true
                //         }
                //     }
                // ]);

                if (!originalEntryRevision) {
                    throw new NotFoundError(
                        `Entry "${id}" of model "${model.modelId}" was not found.`
                    );
                } else if (!latestEntryRevision) {
                    throw new NotFoundError(`Entry "${id}" does not have latest record`);
                }

                const allowedStatuses = [STATUS_DRAFT, STATUS_CHANGES_REQUESTED];
                if (!allowedStatuses.includes(originalEntryRevision.status)) {
                    throw new WebinyError(
                        "Cannot request review - entry is not a draft nor was a change request issued.",
                        "REQUEST_REVIEW_ERROR",
                        {
                            entry: originalEntryRevision
                        }
                    );
                }

                utils.checkOwnership(context, permission, originalEntryRevision, "ownedBy");

                // Change entry's status.
                const entry: CmsContentEntry = {
                    ...originalEntryRevision,
                    status: STATUS_REVIEW_REQUESTED,
                    locked: true
                };

                try {
                    await beforeRequestReviewHook({
                        context,
                        model,
                        originalEntryRevision,
                        entry,
                        latestEntryRevision,
                        storageOperations
                    });
                    const updateRequestReviewEntry = await storageOperations.requestReview(model, {
                        originalEntryRevision,
                        latestEntryRevision,
                        entry
                    });
                    await afterRequestReviewHook({
                        context,
                        model,
                        originalEntryRevision,
                        entry: updateRequestReviewEntry,
                        latestEntryRevision,
                        storageOperations
                    });
                    return updateRequestReviewEntry;
                } catch (ex) {
                    throw new WebinyError(
                        ex.message || "Could not request review on the entry.",
                        ex.code || "REQUEST_REVIEW_ERROR",
                        {
                            originalEntry: originalEntryRevision,
                            latestEntry: latestEntryRevision,
                            entry
                        }
                    );
                }
            },
            unpublish: async (model, id) => {
                const permission = await checkPermissions({ pw: "u" });

                const [entryId] = id.split("#");

                const originalEntryRevision = await storageOperations.getRevisionById(model, id);
                const latestEntryRevision = await storageOperations.getLatestRevisionByEntryId(
                    model,
                    entryId
                );
                const publishedEntryRevision = await storageOperations.getPublishedRevisionByEntryId(
                    model,
                    entryId
                );
                // const [
                //     originalEntryRevision,
                //     latestEntryRevision,
                //     publishedEntryRevision
                // ] = await storageOperations.get/Multiple(model, [
                //     {
                //         where: {
                //             id: uniqueId,
                //             version: parseInt(version)
                //         }
                //     },
                //     {
                //         where: {
                //             id: uniqueId,
                //             latest: true
                //         }
                //     },
                //     {
                //         where: {
                //             id: uniqueId,
                //             published: true
                //         }
                //     }
                // ]);
                /*
                const [[[originalEntry]], [[latestEntryData]], [[publishedEntryData]]] = await db
                    .batch()
                    .read({
                        ...utils.defaults.db(),
                        query: {PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version)}
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: {PK: PK_ENTRY(uniqueId), SK: SK_LATEST()}
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: {PK: PK_ENTRY(uniqueId), SK: SK_PUBLISHED()}
                    })
                    .execute();
                */

                if (!originalEntryRevision) {
                    throw new NotFoundError(
                        `Entry "${id}" of model "${model.modelId}" was not found.`
                    );
                }

                utils.checkOwnership(context, permission, originalEntryRevision, "ownedBy");

                if (!publishedEntryRevision || publishedEntryRevision.id !== id) {
                    throw new WebinyError(`Entry is not published.`, "UNPUBLISH_ERROR", {
                        originalEntry: originalEntryRevision
                    });
                }
                /*
                entry.status = STATUS_UNPUBLISHED;
                
                await beforeUnpublishHook({
                    context,
                    model,
                    entry, storageOperations
                });
                
                const batch = db
                    .batch()
                    .delete({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_PUBLISHED()
                        }
                    })
                    .delete({
                        ...utils.defaults.esDb(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_PUBLISHED()
                        }
                    })
                    .update({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_REVISION(version)
                        },
                        data: entry
                    });
                
                
                // If we are unpublishing the latest revision, let's also update the latest revision entry's status in ES.
                if(latestEntry.id === id) {
                    const es = utils.defaults.es(context, model);
                    
                    batch.update({
                        ...utils.defaults.esDb(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST()
                        },
                        data: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST(),
                            index: es.index,
                            data: getESLatestEntryData(context, entry)
                        }
                    });
                }
                
                await batch.execute();
                
                return entry;
                */

                const entry: CmsContentEntry = {
                    ...originalEntryRevision,
                    status: STATUS_UNPUBLISHED
                };

                try {
                    await beforeUnpublishHook({
                        context,
                        model,
                        originalEntryRevision,
                        entry,
                        latestEntryRevision,
                        publishedEntryRevision,
                        storageOperations
                    });
                    const newUnpublishedEntry = await storageOperations.unpublish(model, {
                        originalEntryRevision,
                        entry,
                        latestEntryRevision,
                        publishedEntryRevision
                    });
                    await afterUnpublishHook({
                        context,
                        model,
                        originalEntryRevision,
                        entry,
                        latestEntryRevision,
                        publishedEntryRevision,
                        storageOperations
                    });
                    return newUnpublishedEntry;
                } catch (ex) {
                    throw new WebinyError(
                        ex.message || "Could not unpublish entry.",
                        ex.code || "UNPUBLISH_ERROR",
                        {
                            entry,
                            originalEntry: originalEntryRevision,
                            latestEntry: latestEntryRevision,
                            publishedEntry: publishedEntryRevision
                        }
                    );
                }
            }
        };

        context.cms = {
            ...(context.cms || ({} as any)),
            entries
        };
    }
});

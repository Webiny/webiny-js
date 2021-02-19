import mdbid from "mdbid";
import omit from "lodash/omit";
import cloneDeep from "lodash/cloneDeep";
import { ContextPlugin } from "@webiny/handler/types";
import { NotFoundError } from "@webiny/handler-graphql";
import {
    CmsContentEntryContext,
    CmsContentEntryPermission,
    CmsContentEntry,
    CmsContentModel,
    CmsContext
} from "@webiny/api-headless-cms/types";
import * as utils from "../../../utils";
import { validateModelEntryData } from "./contentEntry/entryDataValidation";
import {
    createElasticsearchQueryBody,
    createElasticsearchLimit,
    prepareEntryToIndex,
    extractEntriesFromIndex
} from "./contentEntry/es";
import * as dataLoaders from "./contentEntry/dataLoaders";
import { createCmsPK } from "../../../utils";
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
import { entryFromStorageTransform, entryToStorageTransform } from "../utils/entryStorage";
import { fixPreBeta5Entries } from "./contentEntry/fixPreBeta5Entries";

const TYPE_ENTRY = "cms.entry";
const TYPE_ENTRY_LATEST = TYPE_ENTRY + ".l";
const TYPE_ENTRY_PUBLISHED = TYPE_ENTRY + ".p";

const STATUS_DRAFT = "draft";
const STATUS_PUBLISHED = "published";
const STATUS_UNPUBLISHED = "unpublished";
const STATUS_CHANGES_REQUESTED = "changesRequested";
const STATUS_REVIEW_REQUESTED = "reviewRequested";

type DbItem<T> = T & {
    PK: string;
    SK: string;
    TYPE: string;
};

const getESLatestEntryData = (context: CmsContext, entry: CmsContentEntry) => {
    return {
        ...entry,
        latest: true,
        __type: TYPE_ENTRY_LATEST,
        webinyVersion: context.WEBINY_VERSION
    };
};

const getESPublishedEntryData = (context: CmsContext, entry: CmsContentEntry) => {
    return {
        ...entry,
        published: true,
        __type: TYPE_ENTRY_PUBLISHED,
        webinyVersion: context.WEBINY_VERSION
    };
};

export default (): ContextPlugin<CmsContext> => ({
    type: "context",
    name: "context-content-model-entry",
    async apply(context) {
        const { db, elasticSearch, security } = context;

        const PK_ENTRY = entryId => `${createCmsPK(context)}#CME#${entryId}`;
        const SK_REVISION = version => {
            return typeof version === "string" ? `REV#${version}` : `REV#${utils.zeroPad(version)}`;
        };
        const SK_LATEST = () => "L";
        const SK_PUBLISHED = () => "P";

        const loaders = {
            getAllEntryRevisions: dataLoaders.getAllEntryRevisions(context, { PK_ENTRY }),
            getRevisionById: dataLoaders.getRevisionById(context, { PK_ENTRY }),
            getPublishedRevisionByEntryId: dataLoaders.getPublishedRevisionByEntryId(context, {
                PK_ENTRY,
                SK_PUBLISHED
            }),
            getLatestRevisionByEntryId: dataLoaders.getLatestRevisionByEntryId(context, {
                PK_ENTRY,
                SK_LATEST
            })
        };

        const checkPermissions = (check: {
            rwd?: string;
            pw?: string;
        }): Promise<CmsContentEntryPermission> => {
            return utils.checkPermissions(context, "cms.contentEntry", check);
        };

        const entries: CmsContentEntryContext = {
            /**
             * Get entries by exact revision IDs from the database.
             */
            getByIds: async (model: CmsContentModel, ids: string[]) => {
                const permission = await checkPermissions({ rwd: "r" });
                utils.checkModelAccess(context, permission, model);

                const { getRevisionById } = loaders;

                const entries = (await getRevisionById.loadMany(ids)) as CmsContentEntry[];

                return entries.filter(entry => utils.validateOwnership(context, permission, entry));
            },
            /**
             * Get latest published revisions by entry IDs.
             */
            getPublishedByIds: async (model: CmsContentModel, ids: string[]) => {
                const permission = await checkPermissions({ rwd: "r" });
                utils.checkModelAccess(context, permission, model);
                const { getPublishedRevisionByEntryId } = loaders;

                // We only need entry ID (not revision ID) to get published revision for that entry.
                const entryIds = ids.map(id => id.split("#")[0]);

                const entries = (await getPublishedRevisionByEntryId.loadMany(
                    entryIds
                )) as CmsContentEntry[];

                return entries.filter(entry => utils.validateOwnership(context, permission, entry));
            },
            /**
             * Get latest revisions by entry IDs.
             */
            getLatestByIds: async (model: CmsContentModel, ids: string[]) => {
                const permission = await checkPermissions({ rwd: "r" });
                utils.checkModelAccess(context, permission, model);
                const { getLatestRevisionByEntryId } = loaders;

                // We only need entry ID (not revision ID) to get the latest revision for that entry.
                const entryIds = ids.map(id => id.split("#")[0]);

                const entries = (await getLatestRevisionByEntryId.loadMany(
                    entryIds
                )) as CmsContentEntry[];

                return entries.filter(entry => utils.validateOwnership(context, permission, entry));
            },
            getEntryRevisions: async entryId => {
                return loaders.getAllEntryRevisions.load(entryId);
            },
            get: async (model, args) => {
                await checkPermissions({ rwd: "r" });
                const [[item]] = await context.cms.entries.list(model, {
                    ...args,
                    limit: 1
                });

                if (!item) {
                    throw new NotFoundError(`Entry not found!`);
                }
                return item;
            },
            list: async (model: CmsContentModel, args = {}, options = {}) => {
                const permission = await checkPermissions({ rwd: "r" });
                utils.checkModelAccess(context, permission, model);

                const limit = createElasticsearchLimit(args.limit, 50);

                // Possibly only get records which are owned by current user
                const ownedBy = permission.own ? context.security.getIdentity().id : undefined;

                const body = createElasticsearchQueryBody({
                    model,
                    args: {
                        ...args,
                        limit
                    },
                    context,
                    ownedBy,
                    parentObject: "values",
                    options
                });

                let response;
                try {
                    response = await elasticSearch.search({
                        ...utils.defaults.es(context, model),
                        body
                    });
                } catch (ex) {
                    throw new WebinyError(ex.message, ex.code, ex.meta);
                }

                const { hits, total } = response.body.hits;
                // TODO remove in v5
                const rawEsItems = await fixPreBeta5Entries({ context, model, hits });
                /////// TODO remove above
                const items = extractEntriesFromIndex({
                    context,
                    model,
                    // TODO uncomment when date/time fields are fixed
                    // entries: hits.map(item => item._source),
                    entries: rawEsItems // TODO remove when above is restored
                });

                const hasMoreItems = items.length > limit;
                if (hasMoreItems) {
                    // Remove the last item from results, we don't want to include it.
                    items.pop();
                }

                // Cursor is the `sort` value of the last item in the array.
                // https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html#search-after
                const meta = {
                    hasMoreItems,
                    totalCount: total.value,
                    cursor:
                        items.length > 0
                            ? utils.encodeElasticsearchCursor(hits[items.length - 1].sort)
                            : null
                };

                return [items, meta];
            },
            listLatest: async function(model, args) {
                return context.cms.entries.list(
                    model,
                    {
                        sort: ["savedOn_DESC"],
                        ...args
                    },
                    {
                        type: TYPE_ENTRY_LATEST
                    }
                );
            },
            listPublished: async function(model, args) {
                return context.cms.entries.list(
                    model,
                    {
                        sort: ["savedOn_DESC"],
                        ...args
                    },
                    {
                        type: TYPE_ENTRY_PUBLISHED
                    }
                );
            },
            create: async (model, inputData) => {
                const permission = await checkPermissions({ rwd: "w" });
                utils.checkModelAccess(context, permission, model);

                // Make sure we only work with fields that are defined in the model.
                const data = model.fields.reduce((acc, field) => {
                    if (field.fieldId in inputData) {
                        acc[field.fieldId] = inputData[field.fieldId];
                    }

                    return acc;
                }, {});

                await validateModelEntryData(context, model, data);

                const identity = security.getIdentity();
                const locale = context.cms.getLocale();

                const [uniqueId, version] = [mdbid(), 1];
                const id = `${uniqueId}#${utils.zeroPad(version)}`;

                const owner = {
                    id: identity.id,
                    displayName: identity.displayName,
                    type: identity.type
                };

                const entry: CmsContentEntry = {
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
                    values: data
                };

                const storageEntry = await entryToStorageTransform(context, model, entry);
                const esEntry = prepareEntryToIndex({
                    context,
                    model,
                    storageEntry: cloneDeep(storageEntry),
                    originalEntry: cloneDeep(entry)
                });
                await beforeCreateHook({ model, entry, context });

                await db
                    .batch()
                    // Create main entry item
                    .create({
                        ...utils.defaults.db(),
                        data: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_REVISION(version),
                            TYPE: TYPE_ENTRY,
                            ...storageEntry
                        }
                    })
                    // Create "latest" entry item
                    .create({
                        ...utils.defaults.db(),
                        data: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST(),
                            TYPE: TYPE_ENTRY_LATEST,
                            ...storageEntry
                        }
                    })
                    .execute();

                try {
                    await elasticSearch.create({
                        ...utils.defaults.es(context, model),
                        id: `CME#L#${uniqueId}`,
                        body: getESLatestEntryData(context, esEntry)
                    });
                } catch (ex) {
                    throw new WebinyError(
                        "Could not create entry in the ES.",
                        "ES_CREATE_ERROR",
                        ex
                    );
                }

                await afterCreateHook({ model, entry, context });

                return storageEntry;
            },
            createRevisionFrom: async (model, sourceId, data = {}) => {
                const permission = await checkPermissions({ rwd: "w" });
                utils.checkModelAccess(context, permission, model);

                // Entries are identified by a common parent ID + Revision number
                const [uniqueId, version] = sourceId.split("#");

                const [[[entry]], [[latestEntry]]] = await db
                    .batch()
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version) }
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_LATEST() }
                    })
                    .execute();

                if (!entry) {
                    throw new NotFoundError(
                        `Entry "${sourceId}" of model "${model.modelId}" was not found.`
                    );
                }

                const identity = security.getIdentity();
                const nextVersion = parseInt(latestEntry.id.split("#")[1]) + 1;
                const id = `${uniqueId}#${utils.zeroPad(nextVersion)}`;

                const storageEntry = await entryToStorageTransform(context, model, ({
                    values: data || {}
                } as unknown) as CmsContentEntry);

                const newEntry: CmsContentEntry = {
                    id,
                    version: nextVersion,
                    modelId: entry.modelId,
                    locale: entry.locale,
                    savedOn: new Date().toISOString(),
                    createdOn: new Date().toISOString(),
                    createdBy: {
                        id: identity.id,
                        displayName: identity.displayName,
                        type: identity.type
                    },
                    ownedBy: entry.ownedBy,
                    locked: false,
                    publishedOn: null,
                    status: STATUS_DRAFT,
                    values: { ...entry.values, ...data, ...storageEntry.values }
                };

                await beforeCreateRevisionFromHook({
                    context,
                    model,
                    entry
                });

                await db
                    .batch()
                    // Create main entry item
                    .create({
                        ...utils.defaults.db(),
                        data: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_REVISION(utils.zeroPad(nextVersion)),
                            TYPE: TYPE_ENTRY,
                            ...newEntry
                        }
                    })
                    // Update "latest" entry item
                    .update({
                        ...utils.defaults.db(),
                        data: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST(),
                            TYPE: TYPE_ENTRY_LATEST,
                            ...newEntry
                        }
                    })
                    .execute();

                // We need to convert data from DB to its original form before constructing ES index data.
                const originalEntry = await entryFromStorageTransform(context, model, newEntry);

                const esEntry = prepareEntryToIndex({
                    context,
                    model,
                    originalEntry: cloneDeep(originalEntry),
                    storageEntry: cloneDeep(newEntry)
                });

                await elasticSearch.index({
                    ...utils.defaults.es(context, model),
                    id: `CME#L#${uniqueId}`,
                    body: getESLatestEntryData(context, esEntry)
                });

                await afterCreateRevisionFromHook({
                    context,
                    model,
                    entry
                });

                return newEntry;
            },
            update: async (model, id, inputData) => {
                const permission = await checkPermissions({ rwd: "w" });
                utils.checkModelAccess(context, permission, model);

                // Make sure we only work with fields that are defined in the model.
                const data = model.fields.reduce((acc, field) => {
                    acc[field.fieldId] = inputData[field.fieldId];
                    return acc;
                }, {});

                // Validate data early. We don't want to query DB if input data is invalid.
                await validateModelEntryData(context, model, data);

                // Now we know the data is valid, proceed with DB calls.
                const [uniqueId, version] = id.split("#");

                const [[[entry]], [[latestEntry]]] = await db
                    .batch()
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version) }
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_LATEST() }
                    })
                    .execute();

                if (!entry) {
                    throw new NotFoundError(
                        `Entry "${id}" of model "${model.modelId}" was not found.`
                    );
                }

                if (entry.locked) {
                    throw new WebinyError(
                        `Cannot update entry because it's locked.`,
                        "CONTENT_ENTRY_UPDATE_ERROR"
                    );
                }

                utils.checkOwnership(context, permission, entry, "ownedBy");

                const preparedForStorageEntry = await entryToStorageTransform(context, model, ({
                    values: data || {}
                } as unknown) as CmsContentEntry);

                // we need full entry because of "before/after save" hooks
                const updatedEntry: CmsContentEntry = {
                    ...entry,
                    savedOn: new Date().toISOString(),
                    values: {
                        // Values from DB
                        ...entry.values,
                        // New values
                        ...data
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

                await beforeUpdateHook({ model, entry: updatedEntry, context });

                await db.update({
                    ...utils.defaults.db(),
                    query: { PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version) },
                    data: {
                        values: updatedStorageEntry.values,
                        savedOn: updatedStorageEntry.savedOn
                    }
                });

                if (latestEntry.id === id) {
                    // We need to convert data from DB to its original form before constructing ES index data.
                    const originalEntry = await entryFromStorageTransform(context, model, entry);
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
                    try {
                        await elasticSearch.update({
                            ...utils.defaults.es(context, model),
                            id: `CME#L#${uniqueId}`,
                            body: {
                                doc: esDoc
                            }
                        });
                    } catch (ex) {
                        throw new WebinyError(ex.message, ex.code || "ES_UPDATE_FAILED", esDoc);
                    }
                }

                await afterUpdateHook({ model, entry: updatedEntry, context });

                return updatedStorageEntry;
            },
            deleteRevision: async (model, revisionId) => {
                const permission = await checkPermissions({ rwd: "d" });
                utils.checkModelAccess(context, permission, model);

                const [uniqueId, version] = revisionId.split("#");

                const [[[entry]], [[latestEntryData]], [[publishedEntryData]]] = await db
                    .batch()
                    .read({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_REVISION(version)
                        }
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST()
                        }
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_PUBLISHED()
                        }
                    })
                    .execute();

                if (!entry) {
                    throw new NotFoundError(`Entry "${revisionId}" was not found!`);
                }

                utils.checkOwnership(context, permission, entry, "ownedBy");

                await beforeDeleteRevisionHook({
                    context,
                    model,
                    entry
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
                const esOperations = [];

                const isLatest = latestEntryData ? latestEntryData.id === revisionId : false;
                const isPublished = publishedEntryData
                    ? publishedEntryData.id === revisionId
                    : false;

                // If the entry is published, remove published data, both from DB and ES.
                if (isPublished) {
                    batch.delete({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_PUBLISHED()
                        }
                    });

                    esOperations.push({
                        delete: { _id: `CME#P#${uniqueId}`, _index: es.index }
                    });
                }

                // If the entry is "latest", set the previous entry as the new latest.
                // Updates must be made on both DB and ES side.
                if (isLatest) {
                    const [[prevLatestEntry]] = await db.read<DbItem<CmsContentEntry>>({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: { $lt: SK_REVISION(version) }
                        },
                        // Sorting in descending order will also make sure we only get items starting with REV#
                        sort: { SK: -1 },
                        limit: 1
                    });

                    if (!prevLatestEntry) {
                        // If we haven't found the previous revision, this must must be the last revision.
                        // We can safely call `deleteEntry` to remove the whole entry and all of the related data.
                        const result = entries.deleteEntry(model, uniqueId);
                        // need to call lifecycle hook because we are ending the execution of this fn here
                        await afterDeleteRevisionHook({
                            context,
                            model,
                            entry
                        });
                        //
                        return result;
                    }

                    // Update latest entry data.
                    batch.update({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_LATEST()
                        },
                        data: {
                            ...latestEntryData,
                            ...omit(prevLatestEntry, ["PK", "SK", "TYPE"])
                        }
                    });

                    // Update the latest revision entry in ES.
                    esOperations.push(
                        { index: { _id: `CME#L#${uniqueId}`, _index: es.index } },
                        getESLatestEntryData(context, prevLatestEntry)
                    );
                }

                // Execute DB operations
                await batch.execute();

                // If the entry was neither published nor latest, we shouldn't have any operations to execute.
                if (esOperations.length) {
                    await elasticSearch.bulk({ body: esOperations });
                }

                await afterDeleteRevisionHook({
                    context,
                    model,
                    entry
                });
            },
            deleteEntry: async (model, entryId) => {
                const permission = await checkPermissions({ rwd: "d" });
                utils.checkModelAccess(context, permission, model);

                const [items] = await db.read<CmsContentEntry>({
                    ...utils.defaults.db(),
                    query: {
                        PK: PK_ENTRY(entryId),
                        SK: { $gt: " " }
                    }
                });

                if (!items.length) {
                    throw new NotFoundError(`Entry "${entryId}" was not found!`);
                }

                utils.checkOwnership(context, permission, entries[0], "ownedBy");

                // need last entry from the items for hooks
                const entry = items[items.length - 1];

                await beforeDeleteHook({
                    context,
                    model,
                    entry
                });

                // Delete all items from DB
                await utils.paginateBatch(items, 25, async items => {
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
                });

                // Remove everything from Elastic Search as well.
                const es = utils.defaults.es(context, model);
                await elasticSearch.bulk({
                    body: [
                        {
                            delete: { _id: `CME#P#${entryId}`, _index: es.index }
                        },
                        {
                            delete: { _id: `CME#L#${entryId}`, _index: es.index }
                        }
                    ]
                });

                await afterDeleteHook({
                    context,
                    model,
                    entry
                });
            },
            publish: async (model, id) => {
                const permission = await checkPermissions({ pw: "p" });
                utils.checkModelAccess(context, permission, model);

                const [uniqueId, version] = id.split("#");

                const [[[entry]], [[latestEntryData]], [[publishedEntryData]]] = await db
                    .batch()
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version) }
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_LATEST() }
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_PUBLISHED() }
                    })
                    .execute();

                if (!entry) {
                    throw new NotFoundError(
                        `Entry "${id}" of model "${model.modelId}" was not found.`
                    );
                }

                utils.checkOwnership(context, permission, entry, "ownedBy");

                // Change entry to "published"
                entry.status = STATUS_PUBLISHED;
                entry.locked = true;
                entry.publishedOn = new Date().toISOString();

                await beforePublishHook({
                    context,
                    model,
                    entry
                });

                const batch = db.batch();

                batch.update({
                    ...utils.defaults.db(),
                    query: {
                        PK: PK_ENTRY(uniqueId),
                        SK: SK_REVISION(version)
                    },
                    data: entry
                });

                if (publishedEntryData) {
                    // If there is a `published` entry already, we need to set it to `unpublished`. We need to
                    // execute two updates: update the previously published entry's status and the published
                    // entry record (PK_ENTRY_PUBLISHED()).

                    // DynamoDB does not support `batchUpdate` - so here we load the previously published
                    // entry's data to update its status within a batch operation. If, hopefully,
                    // they introduce a true update batch operation, remove this `read` call.

                    const [[previouslyPublishedEntry]] = await db.read<CmsContentEntry>({
                        ...utils.defaults.db(),
                        query: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_REVISION(utils.zeroPad(publishedEntryData.version))
                        }
                    });

                    previouslyPublishedEntry.status = STATUS_UNPUBLISHED;

                    batch
                        .update({
                            // Update currently published entry (unpublish it)
                            ...utils.defaults.db(),
                            query: {
                                PK: PK_ENTRY(uniqueId),
                                SK: SK_REVISION(utils.zeroPad(publishedEntryData.version))
                            },
                            data: previouslyPublishedEntry
                        })
                        .update({
                            // Update the helper item in DB with the new published entry ID
                            ...utils.defaults.db(),
                            query: {
                                PK: PK_ENTRY(uniqueId),
                                SK: SK_PUBLISHED()
                            },
                            data: {
                                PK: PK_ENTRY(uniqueId),
                                SK: SK_PUBLISHED(),
                                ...publishedEntryData,
                                ...omit(entry, ["PK", "SK", "TYPE"])
                            }
                        });
                } else {
                    batch.create({
                        ...utils.defaults.db(),
                        data: {
                            PK: PK_ENTRY(uniqueId),
                            SK: SK_PUBLISHED(),
                            TYPE: TYPE_ENTRY_PUBLISHED,
                            ...omit(entry, ["PK", "SK", "TYPE"])
                        }
                    });
                }

                // Finally, execute batch
                await batch.execute();

                // Update data in ES.
                const esOperations = [];
                const es = utils.defaults.es(context, model);

                // If we are publishing the latest revision, let's also update the latest revision's status in ES.
                if (latestEntryData && latestEntryData.id === id) {
                    esOperations.push(
                        { update: { _id: `CME#L#${uniqueId}`, _index: es.index } },
                        {
                            doc: {
                                status: STATUS_PUBLISHED,
                                locked: true,
                                publishedOn: entry.publishedOn
                            }
                        }
                    );
                }
                const originalEntry = await entryFromStorageTransform(context, model, entry);
                const preparedEntry = prepareEntryToIndex({
                    context,
                    model,
                    originalEntry: cloneDeep(originalEntry),
                    storageEntry: cloneDeep(entry)
                });
                // Update the published revision entry in ES.
                esOperations.push(
                    { index: { _id: `CME#P#${uniqueId}`, _index: es.index } },
                    getESPublishedEntryData(context, preparedEntry)
                );

                await elasticSearch.bulk({ body: esOperations });

                // Clear DataLoader cache for this entry.
                loaders.getAllEntryRevisions.clear(uniqueId);

                await afterPublishHook({
                    context,
                    model,
                    entry
                });

                return entry;
            },
            requestChanges: async (model, id) => {
                const permission = await checkPermissions({ pw: "c" });
                const [uniqueId, version] = id.split("#");

                const [[[entry]], [[latestEntryData]]] = await db
                    .batch<[[CmsContentEntry]], [[{ id: string }]]>()
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version) }
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_LATEST() }
                    })
                    .execute();

                if (!entry) {
                    throw new NotFoundError(
                        `Entry "${id}" of model "${model.modelId}" was not found.`
                    );
                }

                if (entry.status !== STATUS_REVIEW_REQUESTED) {
                    throw new WebinyError(
                        "Cannot request changes on an entry that's not under review.",
                        "ENTRY_NOT_UNDER_REVIEW"
                    );
                }

                const identity = context.security.getIdentity();
                if (entry.ownedBy.id === identity.id) {
                    throw new WebinyError(
                        "You cannot request changes on your own entry.",
                        "CANNOT_REQUEST_CHANGES_ON_OWN_ENTRY"
                    );
                }

                utils.checkOwnership(context, permission, entry, "ownedBy");

                // Change entry's status.
                const updatedData = {
                    status: STATUS_CHANGES_REQUESTED,
                    locked: false
                };

                await beforeRequestChangesHook({
                    context,
                    model,
                    entry
                });

                await db.update({
                    ...utils.defaults.db(),
                    query: {
                        PK: PK_ENTRY(uniqueId),
                        SK: SK_REVISION(version)
                    },
                    data: updatedData
                });

                // If we updated the latest version, then make sure the changes are propagated to ES too.
                if (latestEntryData.id === id) {
                    // Index file in "Elastic Search"
                    await elasticSearch.update({
                        ...utils.defaults.es(context, model),
                        id: `CME#L#${uniqueId}`,
                        body: {
                            doc: {
                                status: STATUS_CHANGES_REQUESTED,
                                locked: false
                            }
                        }
                    });
                }

                await afterRequestChangesHook({
                    context,
                    model,
                    entry
                });

                return Object.assign(entry, updatedData);
            },
            requestReview: async (model, id) => {
                const permission = await checkPermissions({ pw: "r" });
                const [uniqueId, version] = id.split("#");

                const [[[entry]], [[latestEntryData]]] = await db
                    .batch<[[CmsContentEntry]], [[{ id: string }]]>()
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version) }
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_LATEST() }
                    })
                    .execute();

                if (!entry) {
                    throw new NotFoundError(
                        `Entry "${id}" of model "${model.modelId}" was not found.`
                    );
                }

                const allowedStatuses = [STATUS_DRAFT, STATUS_CHANGES_REQUESTED];
                if (!allowedStatuses.includes(entry.status)) {
                    throw new Error(
                        "Cannot request review - entry is not a draft nor was a change request issued."
                    );
                }

                utils.checkOwnership(context, permission, entry, "ownedBy");

                // Change entry's status.
                const updatedData = {
                    status: STATUS_REVIEW_REQUESTED,
                    locked: true
                };

                await beforeRequestReviewHook({
                    context,
                    model,
                    entry
                });

                await db.update({
                    ...utils.defaults.db(),
                    query: {
                        PK: PK_ENTRY(uniqueId),
                        SK: SK_REVISION(version)
                    },
                    data: updatedData
                });

                await afterRequestReviewHook({
                    context,
                    model,
                    entry
                });

                // If we updated the latest version, then make sure the changes are propagated to ES too.
                if (latestEntryData.id === id) {
                    // Index file in "Elastic Search"
                    await elasticSearch.update({
                        ...utils.defaults.es(context, model),
                        id: `CME#L#${uniqueId}`,
                        body: {
                            doc: {
                                status: STATUS_REVIEW_REQUESTED,
                                locked: true
                            }
                        }
                    });
                }

                return Object.assign(entry, updatedData);
            },
            unpublish: async (model, id) => {
                const permission = await checkPermissions({ pw: "u" });

                const [uniqueId, version] = id.split("#");

                const [[[entry]], [[latestEntryData]], [[publishedEntryData]]] = await db
                    .batch()
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_REVISION(version) }
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_LATEST() }
                    })
                    .read({
                        ...utils.defaults.db(),
                        query: { PK: PK_ENTRY(uniqueId), SK: SK_PUBLISHED() }
                    })
                    .execute();

                if (!entry) {
                    throw new NotFoundError(
                        `Entry "${id}" of model "${model.modelId}" was not found.`
                    );
                }

                utils.checkOwnership(context, permission, entry, "ownedBy");

                if (!publishedEntryData || publishedEntryData.id !== id) {
                    throw new Error(`Entry "${id}" is not published.`);
                }

                entry.status = STATUS_UNPUBLISHED;

                await beforeUnpublishHook({
                    context,
                    model,
                    entry
                });

                await db
                    .batch()
                    .delete({
                        ...utils.defaults.db(),
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
                    })
                    .execute();

                await afterUnpublishHook({
                    context,
                    model,
                    entry
                });

                // Update data in ES.
                const es = utils.defaults.es(context, model);
                const esOperations = [];

                // If we are unpublishing the latest revision, let's also update the latest revision entry's status in ES.
                if (latestEntryData.id === id) {
                    esOperations.push(
                        { update: { _id: `CME#L#${uniqueId}`, _index: es.index } },
                        { doc: { status: STATUS_UNPUBLISHED } }
                    );
                }

                // Delete the published revision entry in ES.
                esOperations.push({
                    delete: { _id: `CME#P#${uniqueId}`, _index: es.index }
                });

                await elasticSearch.bulk({ body: esOperations });

                return entry;
            }
        };

        context.cms = {
            ...(context.cms || ({} as any)),
            entries
        };
    }
});

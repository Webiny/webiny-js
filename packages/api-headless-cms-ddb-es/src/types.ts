import { Plugin } from "@webiny/plugins/types";
import {
    CmsContentEntry,
    CmsModelFieldToGraphQLPlugin,
    CmsContentModel,
    CmsContentModelField,
    CmsContext
} from "@webiny/api-headless-cms/types";
import {
    ElasticsearchQuery,
    ElasticsearchQueryOperator
} from "@webiny/api-plugin-elastic-search-client/types";

/**
 * Definition for arguments of the ElasticsearchQueryBuilderPlugin.apply method.
 *
 * @see ElasticsearchQueryBuilderPlugin.apply
 *
 * @category Plugin
 * @category Elasticsearch
 */
export interface ElasticsearchQueryBuilderArgsPlugin {
    field: string;
    value: any;
    context: CmsContext;
    parentObject?: string;
    originalField?: string;
}

/**
 * Arguments for ElasticsearchQueryPlugin.
 *
 * @see ElasticsearchQueryPlugin.modify
 */
interface ElasticsearchQueryPluginArgs {
    query: ElasticsearchQuery;
    model: CmsContentModel;
    context: CmsContext;
}

/**
 * A plugin definition to modify Elasticsearch query.
 *
 * @category Plugin
 * @category Elasticsearch
 */
export interface ElasticsearchQueryPlugin extends Plugin {
    type: "cms-elasticsearch-query";
    modify: (args: ElasticsearchQueryPluginArgs) => void;
}

/**
 * A plugin definition to build Elasticsearch query.
 *
 * @category Plugin
 * @category Elasticsearch
 */
export interface ElasticsearchQueryBuilderPlugin extends Plugin {
    /**
     * A plugin type.
     */
    type: "cms-elastic-search-query-builder";
    /**
     * Name of the plugin. Name it for better debugging experience.
     */
    name: string;
    /**
     * Target operator.
     */
    operator: ElasticsearchQueryOperator;
    /**
     * Method used to modify received query object.
     * Has access to whole query object so it can remove something added by other plugins.
     */
    apply: (query: ElasticsearchQuery, args: ElasticsearchQueryBuilderArgsPlugin) => void;
}

/**
 * Arguments for ElasticsearchQueryBuilderValueSearchPlugin.
 *
 * @see ElasticsearchQueryBuilderValueSearchPlugin.transform
 */
interface ElasticsearchQueryBuilderValueSearchPluginArgs {
    field: CmsContentModelField;
    value: any;
    context: CmsContext;
}

/**
 * A plugin definition for transforming the search value for Elasticsearch.
 *
 * @category Plugin
 * @category Elasticsearch
 */
export interface ElasticsearchQueryBuilderValueSearchPlugin extends Plugin {
    /**
     * A plugin type.
     */
    type: "cms-elastic-search-query-builder-value-search";
    /**
     * A field type for plugin to target.
     */
    fieldType: string;
    /**
     * Transform value that is going to be searched for in the Elasticsearch.
     */
    transform: (args: ElasticsearchQueryBuilderValueSearchPluginArgs) => any;
}

/**
 * A definition of the entry that is being prepared for the Elasticsearch.
 *
 * @category Elasticsearch
 * @category ContentEntry
 */
export interface CmsContentIndexEntry extends CmsContentEntry {
    /**
     * Values that are not going to be indexed.
     */
    rawValues: Record<string, any>;
    /**
     * A first part of the ID, without the revision.
     * For example, we can search for all the revisions of the given entry.
     */
    primaryId: string;
    /**
     * Dev can add what ever keys they want and need. Just need to be careful not to break the entry.
     */
    [key: string]: any;
}

/**
 * Arguments for the method that is transforming content entry in its original form to the one we are storing to the Elasticsearch.
 *
 * @category Elasticsearch
 * @category ContentEntry
 */
interface CmsModelFieldToElasticsearchToArgs {
    fieldTypePlugin: CmsModelFieldToGraphQLPlugin;
    field: CmsContentModelField;
    context: CmsContext;
    model: CmsContentModel;
    /**
     * This is the entry that will go into the index
     * It is exact copy of storageEntry at the beginning of the toIndex loop
     * Always return top level properties that you want to merge together, eg. {values: {...toIndexEntry.values, ...myValues}}
     */
    toIndexEntry: CmsContentIndexEntry;
    /**
     * This is the entry in the same form it gets stored to DB (processed, possibly compressed, etc.)
     */
    storageEntry: CmsContentEntry;
    /**
     * This is the entry in the original form (the way it comes into the API)
     */
    originalEntry: CmsContentEntry;
}

/**
 * Arguments for the method that is transforming content entry from Elasticsearch into the original one.
 *
 * @category Elasticsearch
 * @category ContentEntry
 */
interface CmsModelFieldToElasticsearchFromArgs {
    context: CmsContext;
    model: CmsContentModel;
    fieldTypePlugin: CmsModelFieldToGraphQLPlugin;
    field: CmsContentModelField;
    /**
     * The entry that is received from Elasticsearch.
     */
    entry: CmsContentIndexEntry;
}

/**
 * A plugin defining transformation of entry for Elasticsearch.
 *
 * @category Plugin
 * @category ContentModelField
 * @category ContentEntry
 * @category Elasticsearch
 */
export interface CmsModelFieldToElasticsearchPlugin extends Plugin {
    /**
     * A plugin type
     */
    type: "cms-model-field-to-elastic-search";
    /**
     * A unique identifier of the field type (text, number, json, myField, ...).
     *
     * ```ts
     * fieldType: "myField"
     * ```
     */
    fieldType: string;
    /**
     * If you need to define a type when building an Elasticsearch query.
     * Check [dateTimeIndexing](https://github.com/webiny/webiny-js/blob/3074165701b8b45e5fc6ac2444caace7d04ada66/packages/api-headless-cms/src/content/plugins/es/indexing/dateTimeIndexing.ts) plugin for usage example.
     *
     * ```ts
     * unmappedType: "date"
     * ```
     */
    unmappedType?: (field: CmsContentModelField) => string;
    /**
     * This is meant to do some transformation of the entry, preferably only to fieldType it was defined for. Nothing is stopping you to do anything you want to other fields, but try to separate field transformations.
     * It returns `Partial<CmsContentIndexEntryType>`. Always return a top-level property of the entry since it is merged via spread operator.
     *
     * ```ts
     * toIndex({toIndexEntry, storageEntry, originalEntry, field}) {
     *    const value = toIndexEntry.values[field.fieldId];
     *    delete toIndexEntry.values[field.fieldId];
     *    return {
     *        values: toIndexEntry.values,
     *        rawValues: {
     *            ...toIndexEntry.rawValues,
     *            [field.fieldId]: JSON.stringify(value),
     *        },
     *    };
     * }
     * ```
     */
    toIndex?: (params: CmsModelFieldToElasticsearchToArgs) => Partial<CmsContentIndexEntry>;
    /**
     * This is meant to revert a transformation done in the `toIndex` method. Again, you can transform any field but try to keep things separated. It returns `Partial<CmsContentIndexEntryType>`. Always return a top-level property of the entry since it is merged via spread operator.
     *
     * ```ts
     * fromIndex({entry, field}) {
     *     const value = entry.rawValues[field.fieldId];
     *     delete entry.rawValues[field.fieldId];
     *     return {
     *         values: {
     *             ...entry.values,
     *             [field.fieldId]: JSON.parse(value),
     *         },
     *         rawValues: entry.rawValues,
     *     };
     * }
     * ```
     */
    fromIndex?: (params: CmsModelFieldToElasticsearchFromArgs) => Partial<CmsContentIndexEntry>;
}

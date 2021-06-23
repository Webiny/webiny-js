import { BaseI18NContentContext } from "@webiny/api-i18n-content/types";
import { FileStorage } from "./plugins/storage/FileStorage";
import { TenancyContext } from "@webiny/api-tenancy/types";
import { SecurityContext, SecurityPermission } from "@webiny/api-security/types";
import { ContextInterface } from "@webiny/handler/types";

export interface FileManagerContext
    extends ContextInterface,
        SecurityContext,
        TenancyContext,
        BaseI18NContentContext {
    fileManager: {
        files: FilesCRUD;
        settings: SettingsCRUD;
        storage: FileStorage;
        system: SystemCRUD;
    };
}

export interface FilePermission extends SecurityPermission {
    name: "fm.file";
    rwd?: string;
    own?: boolean;
}

export interface File {
    id: string;
    key: string;
    size: number;
    type: string;
    name: string;
    meta: Record<string, any>;
    tags: string[];
    createdOn: string;
    createdBy: CreatedBy;
    /**
     * Added with new storage operations refactoring.
     */
    tenant: string;
    locale: string;
    webinyVersion: string;
    /**
     * User can add new fields to the File object so we must allow it in the types.
     */
    [key: string]: any;
}

export interface CreatedBy {
    id: string;
    displayName: string;
    type: string;
}

export interface FileInput {
    key: string;
    name: string;
    size: number;
    type: string;
    meta: Record<string, any>;
    tags: [string];
}

export interface FilesListOpts {
    search?: string;
    types?: string[];
    tags?: string[];
    ids?: string[];
    limit?: number;
    after?: string;
}

export interface FileListMeta {
    cursor: string;
    totalCount: number;
}

interface FilesCrudListTagsWhere {
    tag?: string;
    tag_contains?: string;
    tag_in?: string[];
}
interface FilesCrudListTagsParams {
    where?: FilesCrudListTagsWhere;
    limit?: number;
    after?: string;
}

export interface FilesCRUD {
    getFile(id: string): Promise<File>;
    listFiles(opts?: FilesListOpts): Promise<[File[], FileListMeta]>;
    listTags(params?: FilesCrudListTagsParams): Promise<string[]>;
    createFile(data: FileInput): Promise<File>;
    updateFile(id: string, data: Partial<FileInput>): Promise<File>;
    deleteFile(id: string): Promise<boolean>;
    createFilesInBatch(data: FileInput[]): Promise<File[]>;
}

export interface SystemCRUD {
    getVersion(): Promise<string>;
    setVersion(version: string): Promise<void>;
    install(args: { srcPrefix: string }): Promise<boolean>;
    upgrade(version: string, data?: Record<string, any>): Promise<boolean>;
}

export interface FileManagerSettings {
    key: string;
    uploadMinFileSize: number;
    uploadMaxFileSize: number;
    srcPrefix: string;
}

export interface FileManagerSystem {
    version: string;
}

export type SettingsCRUD = {
    getSettings(): Promise<FileManagerSettings>;
    createSettings(data?: Partial<FileManagerSettings>): Promise<FileManagerSettings>;
    updateSettings(data: Partial<FileManagerSettings>): Promise<FileManagerSettings>;
    deleteSettings(): Promise<boolean>;
};
/********
 * Storage operations
 *******/

/**
 * @category StorageOperations
 * @category SystemStorageOperations
 * @category SystemStorageOperationsParams
 */
export interface FileManagerSystemStorageOperationsUpdateParams {
    /**
     * The system data to be updated.
     */
    original: FileManagerSystem;
    /**
     * The system data with the updated fields.
     */
    data: FileManagerSystem;
}
/**
 * @category StorageOperations
 * @category SystemStorageOperations
 * @category SystemStorageOperationsParams
 */
export interface FileManagerSystemStorageOperationsCreateParams {
    /**
     * The system fields.
     */
    data: FileManagerSystem;
}

/**
 * @category StorageOperations
 * @category SystemStorageOperations
 */
export interface FileManagerSystemStorageOperations {
    /**
     * Get the FileManager system data.
     */
    get: () => Promise<FileManagerSystem | null>;
    /**
     * Update the FileManager system data..
     */
    update: (params: FileManagerSystemStorageOperationsUpdateParams) => Promise<FileManagerSystem>;
    /**
     * Create the FileManagerSystemData
     */
    create: (params: FileManagerSystemStorageOperationsCreateParams) => Promise<FileManagerSystem>;
}

/**
 * @category StorageOperations
 * @category SettingsStorageOperations
 * @category SettingsStorageOperationsParams
 */
export interface FileManagerSettingsStorageOperationsUpdateParams {
    /**
     * Original settings to be updated.
     */
    original: FileManagerSettings;
    /**
     * The settings with the updated fields.
     */
    data: FileManagerSettings;
}
/**
 * @category StorageOperations
 * @category SettingsStorageOperations
 * @category SettingsStorageOperationsParams
 */
export interface FileManagerSettingsStorageOperationsCreateParams {
    /**
     * The settings fields.
     */
    data: FileManagerSettings;
}

/**
 * @category StorageOperations
 * @category SettingsStorageOperations
 */
export interface FileManagerSettingsStorageOperations {
    /**
     * Get the FileManager system data.
     */
    get: () => Promise<FileManagerSettings | null>;
    /**
     * Create the FileManagerSettingsData
     */
    create: (
        params: FileManagerSettingsStorageOperationsCreateParams
    ) => Promise<FileManagerSettings>;
    /**
     * Update the FileManager system data..
     */
    update: (
        params: FileManagerSettingsStorageOperationsUpdateParams
    ) => Promise<FileManagerSettings>;
    /**
     * Delete the existing settings.
     */
    delete: () => Promise<void>;
}

/**
 * @category StorageOperations
 * @category FilesStorageOperations
 * @category FilesStorageOperationsParams
 */
export interface FileManagerFilesStorageOperationsCreateParams {
    file: File;
}
/**
 * @category StorageOperations
 * @category FilesStorageOperations
 * @category FilesStorageOperationsParams
 */
export interface FileManagerFilesStorageOperationsUpdateParams {
    original: File;
    file: File;
}
/**
 * @category StorageOperations
 * @category FilesStorageOperations
 * @category FilesStorageOperationsParams
 */
export interface FileManagerFilesStorageOperationsCreateBatchParams {
    files: File[];
}
/**
 * @category StorageOperations
 * @category FilesStorageOperations
 * @category FilesStorageOperationsParams
 */
export interface FileManagerFilesStorageOperationsListParamsWhere {
    id?: string;
    id_in?: string[];
    name?: string;
    name_contains?: string;
    tag?: string;
    tag_contains?: string;
    tag_in?: string[];
    /**
     * TODO: determine if to remove the search and use name or tag params.
     */
    search?: string;
    createdBy?: string;
    locale?: string;
    tenant?: string;
    private?: boolean;
    type?: string;
    type_in?: string[];
}
/**
 * @category StorageOperations
 * @category FilesStorageOperations
 * @category FilesStorageOperationsParams
 */
export interface FileManagerFilesStorageOperationsListParams {
    where: FileManagerFilesStorageOperationsListParamsWhere;
    sort: string[];
    limit: number;
    after: string | null;
}

/**
 * @category StorageOperations
 * @category FilesStorageOperations
 * @category FilesStorageOperationsParams
 */
interface FileManagerFilesStorageOperationsListResponseMeta {
    hasMoreItems: boolean;
    totalCount: number;
    cursor: string;
}
export type FileManagerFilesStorageOperationsListResponse = [
    File[],
    FileManagerFilesStorageOperationsListResponseMeta
];

export type FileManagerFilesStorageOperationsTagsResponse = [
    string[],
    FileManagerFilesStorageOperationsListResponseMeta
];

export interface FileManagerFilesStorageOperationsTagsParamsWhere extends FilesCrudListTagsWhere {
    locale: string;
    tenant?: string;
}
/**
 * @category StorageOperations
 * @category FilesStorageOperations
 * @category FilesStorageOperationsParams
 */
export interface FileManagerFilesStorageOperationsTagsParams {
    where: FileManagerFilesStorageOperationsTagsParamsWhere;
    limit: number;
    after?: string;
}
/**
 * @category StorageOperations
 * @category FilesStorageOperations
 */
export interface FileManagerFilesStorageOperations {
    /**
     * Get a single file with given ID from the storage.
     */
    get: (id: string) => Promise<File | null>;
    /**
     * Insert the file data into the database.
     */
    create: (params: FileManagerFilesStorageOperationsCreateParams) => Promise<File | null>;
    /**
     * Update the file data in the database.
     */
    update: (params: FileManagerFilesStorageOperationsUpdateParams) => Promise<File | null>;
    /**
     * Delete the file from the database.
     */
    delete: (id: string) => Promise<void>;
    /**
     * Store multiple files at once to the database.
     */
    createBatch: (params: FileManagerFilesStorageOperationsCreateBatchParams) => Promise<File[]>;
    /**
     * Get a list of files filtered by given parameters.
     */
    list: (
        params: FileManagerFilesStorageOperationsListParams
    ) => Promise<FileManagerFilesStorageOperationsListResponse>;
    /**
     * Get a list of all file tags filtered by given parameters.
     */
    tags: (
        params: FileManagerFilesStorageOperationsTagsParams
    ) => Promise<FileManagerFilesStorageOperationsTagsResponse>;
}

/**
 * Parameters for beforeCreate lifecycle.
 */
export interface FilePluginBeforeCreateConfig {
    /**
     * Data to be inserted into the storage.
     */
    data: File;
}
/**
 * Parameters for afterCreate lifecycle.
 */
export interface FilePluginAfterCreateConfig {
    /**
     * Data that was inserted into the storage.
     */
    data: File;
    /**
     * Result of the storage operations create method.
     * Possibly changed something on the "data".
     */
    file: File;
}
/**
 * Parameters for beforeUpdate lifecycle.
 */
export interface FilePluginBeforeUpdateConfig {
    /**
     * Original file from the storage.
     */
    original: File;
    /**
     * Data to be updated to the storage.
     */
    data: File;
}
/**
 * Parameters for afterUpdate lifecycle.
 */
export interface FilePluginAfterUpdateConfig {
    /**
     * Original file from the storage.
     */
    original: File;
    /**
     * Data that was updated in the storage.
     */
    data: File;
    /**
     * Result of the storage operations update method.
     * Possibly changed something on the "data".
     */
    file: File;
}
/**
 * Parameters for beforeBatchCreate lifecycle.
 */
export interface FilePluginBeforeBatchCreateConfig {
    /**
     * Files to be inserted into the storage.
     */
    data: File[];
}

/**
 * Parameters for afterBatchCreate lifecycle.
 */
export interface FilePluginAfterBatchCreateConfig {
    /**
     * Files that were inserted into the storage.
     */
    data: File[];
    /**
     * Results of the insert.
     */
    files: File[];
}
/**
 * Parameters for beforeDelete lifecycle.
 */
export interface FilePluginBeforeDeleteConfig {
    /**
     * File to be deleted from the storage.
     */
    file: File;
}
/**
 * Parameters for afterDelete lifecycle.
 */
export interface FilePluginAfterDeleteConfig {
    /**
     * File that was deleted from the storage.
     */
    file: File;
}

/**
 * Definition for the constructor parameters of the FilePlugin.
 *
 * @category FilePlugin
 */
export interface FilePluginConfig {
    /**
     * A field name this plugin is for.
     * Must be defined because it is used to add the field into the File object.
     */
    field: string;
    beforeCreate?: (params: FilePluginBeforeCreateConfig) => Promise<void>;
    afterCreate?: (params: FilePluginAfterCreateConfig) => Promise<void>;
    beforeUpdate?: (params: FilePluginBeforeUpdateConfig) => Promise<void>;
    afterUpdate?: (params: FilePluginAfterUpdateConfig) => Promise<void>;
    beforeBatchCreate?: (params: FilePluginBeforeBatchCreateConfig) => Promise<void>;
    afterBatchCreate?: (params: FilePluginAfterBatchCreateConfig) => Promise<void>;
    beforeDelete?: (params: FilePluginBeforeDeleteConfig) => Promise<void>;
    afterDelete?: (params: FilePluginAfterDeleteConfig) => Promise<void>;
}

export interface FileStorageTransformToConfig {
    /**
     * File that is being sent to the storage operations method.
     */
    file: File & Record<string, any>;
}

export interface FileStorageTransformFromConfig {
    /**
     * File that was fetched from the storage operations method.
     */
    file: File & Record<string, any>;
}

export interface FileStorageTransformPluginConfig {
    toStorage?: (params: FileStorageTransformToConfig) => Promise<File & Record<string, any>>;
    fromStorage?: (params: FileStorageTransformFromConfig) => Promise<File & Record<string, any>>;
}

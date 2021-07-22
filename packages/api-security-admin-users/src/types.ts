import { ContextInterface } from "@webiny/handler/types";
import { SecurityContextBase, SecurityPermission } from "@webiny/api-security/types";
import { TenancyContext, Tenant } from "@webiny/api-tenancy/types";
import { HttpContext } from "@webiny/handler-http/types";
import { DbContext } from "@webiny/handler-db/types";
import { SecurityIdentity } from "@webiny/api-security/types";

export interface CreatedBy {
    id: string;
    displayName: string;
    type: string;
}

export interface Group {
    tenant: string;
    createdOn: string;
    createdBy: CreatedBy;
    name: string;
    slug: string;
    description: string;
    system: boolean;
    permissions: SecurityPermission[];
}

export interface User {
    /**
     * Added for the storage operations refactoring.
     */
    id: string;
    /**
     * Old.
     */
    login: string;
    firstName: string;
    lastName: string;
    avatar?: Record<string, any>;
    createdOn: string;
    createdBy: CreatedBy;
}

export interface UserPersonalAccessToken {
    id: string;
    name: string;
    token: string;
    login: string;
    createdOn: string;
}

export interface TenantAccess {
    tenant: {
        id: string;
        name: string;
    };
    group: {
        slug: string;
        name: string;
        permissions: SecurityPermission[];
    };
}

export interface CreateUserInput {
    login: string;
    firstName: string;
    lastName: string;
    avatar?: Record<string, any>;
    group?: string;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, "login">>;

export interface GroupInput {
    name: string;
    slug: string;
    description: string;
    system: boolean;
    permissions: SecurityPermission[];
}

export interface CreatePersonalAccessTokenInput {
    name: string;
    token: string;
}

export interface UpdatePersonalAccessTokenInput {
    name: string;
}

export interface ApiKey {
    id: string;
    tenant: string;
    name: string;
    description: string;
    token: string;
    permissions: SecurityPermission[];
    createdBy: CreatedBy;
    createdOn: string;
}

export interface ApiKeyInput {
    name: string;
    description: string;
    permissions: SecurityPermission[];
}

export interface SystemCRUD {
    get(): Promise<System>;
    getVersion(): Promise<string>;
    setVersion(version: string): Promise<System>;
    install(input: CreateUserInput): Promise<void>;
}

export interface GroupsCRUD {
    getGroup(slug: string): Promise<Group | null>;
    listGroups(): Promise<Group[]>;
    createGroup(data: GroupInput): Promise<Group>;
    updateGroup(slug: string, data: Partial<Omit<GroupInput, "system" | "slug">>): Promise<Group>;
    deleteGroup(slug: string): Promise<boolean>;
}

export interface UsersCRUD {
    login(): Promise<User>;
    getUser(login: string, options?: { auth?: boolean }): Promise<User>;
    listUsers(options?: { tenant?: string; auth?: boolean }): Promise<User[]>;
    createUser(data: CreateUserInput, options?: { auth?: boolean }): Promise<User>;
    updateUser(login: string, data: UpdateUserInput): Promise<User>;
    deleteUser(login: string): Promise<boolean>;
    linkUserToTenant(id: string, tenant: Tenant, group: Group): Promise<void>;
    unlinkUserFromTenant(id: string, tenant: Tenant): Promise<void>;
    getUserAccess(login: string): Promise<TenantAccess[]>;
    getPersonalAccessToken(login: string, tokenId: string): Promise<UserPersonalAccessToken>;
    getUserByPersonalAccessToken(token: string): Promise<User>;
    listTokens(login: string): Promise<UserPersonalAccessToken[]>;
    createToken(
        identity: SecurityIdentity,
        data: CreatePersonalAccessTokenInput
    ): Promise<UserPersonalAccessToken>;
    updateToken(
        login: string,
        tokenId: string,
        data: UpdatePersonalAccessTokenInput
    ): Promise<UpdatePersonalAccessTokenInput>;
    deleteToken(login: string, tokenId: string): Promise<boolean>;
}

export interface ApiKeysCRUD {
    getApiKey(id: string): Promise<ApiKey>;
    getApiKeyByToken(token: string): Promise<ApiKey>;
    listApiKeys(): Promise<ApiKey[]>;
    createApiKey(data: ApiKeyInput): Promise<ApiKey>;
    updateApiKey(id: string, data: ApiKeyInput): Promise<ApiKey>;
    deleteApiKey(id: string): Promise<boolean>;
}

// Helper types when working with database
export interface DbItemSecurityUser2Tenant {
    PK: string;
    SK: string;
    TYPE: "SecurityUser2Tenant";
    tenant: {
        id: string;
        name: string;
    };
    group: {
        slug: string;
        name: string;
        permissions: SecurityPermission[];
    };
}

export interface ApiKeyPermission extends SecurityPermission {
    name: "security.apiKey";
}

export interface AdminUsers {
    users?: UsersCRUD;
    groups?: GroupsCRUD;
    apiKeys?: ApiKeysCRUD;
    system?: SystemCRUD;
}

export interface AdminUsersContext
    extends TenancyContext,
        ContextInterface,
        HttpContext,
        DbContext {
    security: AdminUsers & SecurityContextBase;
}

/**
 * @category ApiKeyStorageOperations
 */
export interface ApiKeyStorageOperationsGetParams {
    id: string;
}

/**
 * @category ApiKeyStorageOperations
 */
export interface ApiKeyStorageOperationsGetByTokenParams {
    token: string;
}

/**
 * @category ApiKeyStorageOperations
 */
export interface ApiKeyStorageOperationsListParams {
    sort?: string[];
}

/**
 * @category ApiKeyStorageOperations
 */
export interface ApiKeyStorageOperationsCreateParams {
    apiKey: ApiKey;
}

/**
 * @category ApiKeyStorageOperations
 */
export interface ApiKeyStorageOperationsUpdateParams {
    original: ApiKey;
    apiKey: ApiKey;
}

/**
 * @category ApiKeyStorageOperations
 */
export interface ApiKeyStorageOperationsDeleteParams {
    apiKey: ApiKey;
}

/**
 * Description on how to implement the storage operation in the package.
 *
 * @category StorageOperations
 * @category ApiKeyStorageOperations
 */
export interface ApiKeyStorageOperations {
    get: (params: ApiKeyStorageOperationsGetParams) => Promise<ApiKey>;
    getByToken: (params: ApiKeyStorageOperationsGetByTokenParams) => Promise<ApiKey>;
    list: (params: ApiKeyStorageOperationsListParams) => Promise<ApiKey[]>;
    create: (params: ApiKeyStorageOperationsCreateParams) => Promise<ApiKey>;
    update: (params: ApiKeyStorageOperationsUpdateParams) => Promise<ApiKey>;
    delete: (params: ApiKeyStorageOperationsDeleteParams) => Promise<ApiKey>;
}

/**
 * @category GroupsStorageOperations
 */
export interface GroupsStorageOperationsGetParams {
    slug: string;
}

/**
 * @category GroupsStorageOperations
 */
export interface GroupsStorageOperationsListParams {
    sort?: string[];
}

/**
 * @category GroupsStorageOperations
 */
export interface GroupsStorageOperationsCreateParams {
    group: Group;
}

/**
 * @category GroupsStorageOperations
 */
export interface GroupsStorageOperationsCreateParams {
    group: Group;
}

/**
 * @category GroupsStorageOperations
 */
export interface GroupsStorageOperationsUpdateParams {
    original: Group;
    group: Group;
}

/**
 * @category GroupsStorageOperations
 */
export interface GroupsStorageOperationsDeleteParams {
    group: Group;
}

/**
 * @category GroupsStorageOperations
 */
export interface GroupsStorageOperationsUpdateUserLinksParams {
    group: Group;
}

/**
 * @category StorageOperations
 * @category GroupsStorageOperations
 */
export interface GroupsStorageOperations {
    get: (tenant: Tenant, params: GroupsStorageOperationsGetParams) => Promise<Group>;
    list: (tenant: Tenant, params: GroupsStorageOperationsListParams) => Promise<Group[]>;
    create: (tenant: Tenant, params: GroupsStorageOperationsCreateParams) => Promise<Group>;
    update: (tenant: Tenant, params: GroupsStorageOperationsUpdateParams) => Promise<Group>;
    delete: (tenant: Tenant, params: GroupsStorageOperationsDeleteParams) => Promise<Group>;
    updateUserLinks: (
        tenant: Tenant,
        params: GroupsStorageOperationsUpdateUserLinksParams
    ) => Promise<void>;
}

/**
 * @category System
 * @category Model
 */
export interface System {
    version?: string;
}

/**
 * @category StorageOperations
 * @category SystemStorageOperations
 */
export interface SystemStorageOperationsCreateParams {
    system: System;
}

/**
 * @category StorageOperations
 * @category SystemStorageOperations
 */
export interface SystemStorageOperationsUpdateParams {
    original: System;
    system: System;
}

/**
 * @category StorageOperations
 * @category SystemStorageOperations
 */
export interface SystemStorageOperations {
    get: () => Promise<System>;
    create: (params: SystemStorageOperationsCreateParams) => Promise<System>;
    update: (params: SystemStorageOperationsUpdateParams) => Promise<System>;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsGetParams {
    id: string;
}
/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsGetUserByPatParams {
    token: string;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsListParamsWhere {
    tenant: string;
    id_in?: string[];
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsListParams {
    where: UserStorageOperationsListParamsWhere;
    sort?: string[];
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsCreateParams {
    user: User;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsUpdateParams {
    user: User;
    original: User;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsDeleteParams {
    user: User;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsCreateTokenParams {
    identity: SecurityIdentity;
    token: UserPersonalAccessToken;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsUpdateTokenParams {
    original: UserPersonalAccessToken;
    token: UserPersonalAccessToken;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsDeleteTokenParams {
    identity: SecurityIdentity;
    token: UserPersonalAccessToken;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsGetTokenParams {
    login: string;
    tokenId: string;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsListTokensParams {
    login: string;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsLinkUserToTenantParams {
    tenant: Tenant;
    group: Group;
    user: User;
    link: TenantAccess;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperationsUnlinkUserFromTenantParams {
    tenant: Tenant;
    user: User;
}

/**
 * @category StorageOperations
 * @category UserStorageOperations
 */
export interface UserStorageOperations {
    // users
    getUser: (params: UserStorageOperationsGetParams) => Promise<User>;
    getUserByPersonalAccessToken: (
        params: UserStorageOperationsGetUserByPatParams
    ) => Promise<User>;
    listUsers: (params: UserStorageOperationsListParams) => Promise<User[]>;
    createUser: (params: UserStorageOperationsCreateParams) => Promise<User>;
    updateUser: (params: UserStorageOperationsUpdateParams) => Promise<User>;
    /**
     * Delete the user and the tokens that are connected to the user.
     */
    deleteUser: (params: UserStorageOperationsDeleteParams) => Promise<User>;
    // tokens
    createToken: (
        params: UserStorageOperationsCreateTokenParams
    ) => Promise<UserPersonalAccessToken>;
    updateToken: (
        params: UserStorageOperationsUpdateTokenParams
    ) => Promise<UserPersonalAccessToken>;
    deleteToken: (
        params: UserStorageOperationsDeleteTokenParams
    ) => Promise<UserPersonalAccessToken>;
    getPersonalAccessToken: (
        params: UserStorageOperationsGetTokenParams
    ) => Promise<UserPersonalAccessToken>;
    listTokens: (
        params: UserStorageOperationsListTokensParams
    ) => Promise<UserPersonalAccessToken[]>;

    // linkers
    linkUserToTenant: (params: UserStorageOperationsLinkUserToTenantParams) => Promise<void>;
    unlinkUserFromTenant: (
        params: UserStorageOperationsUnlinkUserFromTenantParams
    ) => Promise<void>;
}

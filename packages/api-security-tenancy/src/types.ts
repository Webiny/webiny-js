import { Plugin } from "@webiny/plugins/types";
import { Context, ContextInterface } from "@webiny/handler/types";
import { SecurityPermission } from "@webiny/api-security/types";
import { DbContext } from "@webiny/handler-db/types";
import { SecurityContextBase } from "@webiny/api-security/types";
import { HttpContext } from "@webiny/handler-http/types";

export type SecurityIdentityProviderPlugin<TData = Record<string, any>> = Plugin & {
    name: "security-identity-provider";
    type: "security-identity-provider";
    // Executed each time a user logs in
    onLogin?: (params: { user: User; firstLogin: boolean }, context: Context) => Promise<void>;
    // Create user in a 3rd party identity provider
    createUser: (
        params: { data: CreateUserInput & TData; permanent?: boolean },
        context: Context
    ) => Promise<void>;
    // Update user in a 3rd party identity provider
    updateUser: (
        params: { data: UpdateUserInput & TData; user: User },
        context: Context
    ) => Promise<void>;
    // Delete user from a 3rd party identity provider
    deleteUser: (params: { user: User }, context: Context) => Promise<void>;
};

export type Tenant = {
    id: string;
    name: string;
    parent: string | null;
};

export type CreatedBy = {
    id: string;
    displayName: string;
    type: string;
};

export type Group = {
    tenant: string;
    createdOn: string;
    createdBy: CreatedBy;
    name: string;
    slug: string;
    description: string;
    system: boolean;
    permissions: SecurityPermission[];
};

export type User = {
    login: string;
    firstName: string;
    lastName: string;
    avatar?: Record<string, any>;
    createdOn: string;
    createdBy: CreatedBy;
};

export type UserPersonalAccessToken = {
    id: string;
    name: string;
    token: string;
    login: string;
    createdOn: string;
};

export type TenantAccess = {
    tenant: {
        id: string;
        name: string;
    };
    group: {
        slug: string;
        name: string;
        permissions: SecurityPermission[];
    };
};

type CreateTenantInput = {
    id?: string;
    name: string;
    parent: string | null;
};

type UpdateTenantInput = {
    name: string;
};

export type CreateUserInput = {
    login: string;
    firstName: string;
    lastName: string;
    avatar?: Record<string, any>;
    group?: string;
};

export type UpdateUserInput = Partial<Omit<CreateUserInput, "login">>;

export type GroupInput = {
    name: string;
    slug: string;
    description: string;
    system: boolean;
    permissions: SecurityPermission[];
};

export type CreatePersonalAccessTokenInput = {
    name: string;
    token: string;
};
export type UpdatePersonalAccessTokenInput = {
    name: string;
};

export type ApiKey = {
    id: string;
    name: string;
    description: string;
    token: string;
    permissions: SecurityPermission[];
    createdBy: CreatedBy;
    createdOn: string;
};

export type ApiKeyInput = {
    name: string;
    description: string;
    permissions: SecurityPermission[];
};

export type TenantsCRUD = {
    getRootTenant(): Promise<Tenant>;
    getTenant(id: string): Promise<Tenant>;
    listTenants(params: { parent?: string }): Promise<Tenant[]>;
    createTenant(data: CreateTenantInput): Promise<Tenant>;
    updateTenant(id: string, data: UpdateTenantInput): Promise<boolean>;
    deleteTenant(id: string): Promise<boolean>;
};

export type GroupsCRUD = {
    getGroup(tenant: Tenant, slug: string): Promise<Group>;
    listGroups(tenant: Tenant): Promise<Group[]>;
    createGroup(tenant: Tenant, data: GroupInput): Promise<Group>;
    updateGroup(tenant: Tenant, slug: string, data: Partial<GroupInput>): Promise<boolean>;
    deleteGroup(tenant: Tenant, slug: string): Promise<boolean>;
    updateUserLinks(tenant: Tenant, group: Group): Promise<void>;
};

export type UsersCRUD = {
    getUser(login: string): Promise<User>;
    listUsers(params?: { tenant: string }): Promise<User[]>;
    createUser(data: CreateUserInput): Promise<User>;
    updateUser(login: string, data: UpdateUserInput): Promise<UpdateUserInput>;
    deleteUser(login: string): Promise<boolean>;
    linkUserToTenant(login: string, tenant: Tenant, group: Group): Promise<void>;
    unlinkUserFromTenant(login: string, tenant: Tenant): Promise<void>;
    getUserAccess(login: string): Promise<TenantAccess[]>;
    getPersonalAccessToken(login: string, tokenId: string): Promise<UserPersonalAccessToken>;
    getUserByPersonalAccessToken(token: string): Promise<User>;
    listTokens(login: string): Promise<UserPersonalAccessToken[]>;
    createToken(
        login: string,
        data: CreatePersonalAccessTokenInput
    ): Promise<UserPersonalAccessToken>;
    updateToken(
        login: string,
        tokenId: string,
        data: UpdatePersonalAccessTokenInput
    ): Promise<UpdatePersonalAccessTokenInput>;
    deleteToken(login: string, tokenId: string): Promise<boolean>;
};

export type ApiKeysCRUD = {
    getApiKey(id: string): Promise<ApiKey>;
    getApiKeyByToken(token: string): Promise<ApiKey>;
    listApiKeys(): Promise<ApiKey[]>;
    createApiKey(data: ApiKeyInput): Promise<ApiKey>;
    updateApiKey(id: string, data: ApiKeyInput): Promise<ApiKey>;
    deleteApiKey(id: string): Promise<boolean>;
};

export type TenancyContextObject = {
    // Get current tenant (loaded using X-Tenant header)
    getTenant(): Tenant;
    // Set current tenant (only if tenant is not already set)
    setTenant(tenant: Tenant): void;
    tenants?: TenantsCRUD;
    users?: UsersCRUD;
    groups?: GroupsCRUD;
    apiKeys?: ApiKeysCRUD;
};

export interface TenancyContext extends ContextInterface, HttpContext, DbContext {
    security: TenancyContextObject & SecurityContextBase;
}

// Helper types when working with database
export type DbItemSecurityUser2Tenant = {
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
};

export type ApiKeyPermission = SecurityPermission<{ name: "security.apiKey" }>;

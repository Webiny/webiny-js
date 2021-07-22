import { SecurityPermission } from "@webiny/api-security/types";
import { AdminUsersContext } from "../types";
import { AuthorizationPlugin } from "@webiny/api-security/plugins/AuthorizationPlugin";

export class AnonymousAuthorizationPlugin extends AuthorizationPlugin<AdminUsersContext> {
    private _permissionCache = new Map<string, SecurityPermission[] | null>();

    async getPermissions({ security, tenancy }: AdminUsersContext) {
        const tenant = tenancy.getCurrentTenant();
        if (!tenant) {
            return [];
        }

        if (security.getIdentity()) {
            return;
        }

        if (this._permissionCache.has(tenant.id)) {
            return this._permissionCache.get(tenant.id);
        }

        // We assume that all other authorization plugins have already been executed.
        // If we've reached this far, it means that we have an anonymous user
        // and we need to load permissions from the "anonymous" group.
        const group = await security.groups.getGroup("anonymous");

        const permissions = group ? group.permissions || [] : [];
        this._permissionCache.set(tenant.id, permissions);

        return permissions;
    }
}

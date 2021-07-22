import { ContextPlugin } from "@webiny/handler/plugins/ContextPlugin";
import { Tenant } from "@webiny/api-tenancy/types";
import usersCrud from "./crud/users.crud";
import groupCrud from "./crud/groups.crud";
import apiKeyCrud from "./crud/apiKey.crud";
import systemCrud from "./crud/system.crud";
import { AdminUsers, AdminUsersContext } from "./types";
import { SecurityContextBase } from "@webiny/api-security/types";

export default () => {
    /**
     * We need the base context to initialize the security variable on the context
     * and to add deprecation warnings on old methods.
     */
    const baseContext = new ContextPlugin<AdminUsersContext>(async context => {
        if (!context.security) {
            context.security = {} as AdminUsers & SecurityContextBase;
        }

        // @ts-ignore
        context.security.getTenant = () => {
            console.log(
                `[DEPRECATION] "context.security.getTenant()" is now deprecated! Use "context.tenancy.getCurrentTenant()" instead.`
            );
            return context.tenancy.getCurrentTenant();
        };

        // @ts-ignore
        context.security.setTenant = (tenant: Tenant) => {
            console.log(
                `[DEPRECATION] "context.security.setTenant()" is now deprecated! Use "context.tenancy.setCurrentTenant()" instead.`
            );
            context.tenancy.setCurrentTenant(tenant);
        };
    });

    return [baseContext, apiKeyCrud, groupCrud, systemCrud, usersCrud];
};

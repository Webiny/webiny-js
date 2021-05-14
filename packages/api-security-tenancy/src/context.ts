import { ContextPlugin } from "@webiny/handler/types";
import { TenancyContext, Tenant } from "./types";
import tenantCrud from "./crud/tenants.crud";
import userCrud from "./crud/users.crud";
import groupCrud from "./crud/groups.crud";
import apiKeyCrud from "./crud/apiKey.crud";
import systemCrud from "./crud/system.crud";

const tenantCache = {};

const getCurrentTenant = async (context: TenancyContext): Promise<Tenant> => {
    const { headers = {} } = context.http.request;

    const tenantId = headers["X-Tenant"] || headers["x-tenant"] || "root";

    if (!tenantCache[tenantId]) {
        tenantCache[tenantId] = await context.security.tenants.getTenant(tenantId);
    }

    return tenantCache[tenantId];
};

export default (): ContextPlugin<TenancyContext> => ({
    type: "context",
    apply: async context => {
        let __tenant = null;

        if (!context.security) {
            // @ts-ignore
            context.security = {};
        }

        context.security.getTenant = () => {
            return __tenant;
        };

        context.security.setTenant = (tenant: Tenant) => {
            if (!__tenant) {
                __tenant = tenant;
            }
        };

        context.security.tenants = tenantCrud(context);
        context.security.users = userCrud(context);
        context.security.groups = groupCrud(context);
        context.security.apiKeys = apiKeyCrud(context);
        context.security.system = systemCrud(context);

        __tenant = await getCurrentTenant(context);
    }
});

import { AdminUsersContext } from "@webiny/api-security-admin-users/types";
import { ApiKeyStorageOperationsDdb } from "./ApiKeyStorageOperations";
import { ApiKeyStorageOperationsProvider } from "@webiny/api-security-admin-users/plugins/ApiKeyStorageOperationsProvider";

interface Params {
    context: AdminUsersContext;
}
export class ApiKeyStorageOperationsProviderDdb extends ApiKeyStorageOperationsProvider {
    public name = "sau.storageOperationsProvider.apiKey.ddb";
    async provide({ context }: Params) {
        return new ApiKeyStorageOperationsDdb({
            context
        });
    }
}

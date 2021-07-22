import { SystemStorageOperationsProvider } from "@webiny/api-security-admin-users/plugins/SystemStorageOperationsProvider";
import { SystemStorageOperationsDdb } from "./SystemStorageOperations";

export class SystemStorageOperationsProviderDdb extends SystemStorageOperationsProvider {
    public name = "sau.storageOperationsProvider.system.ddb";

    public async provide({ context }): Promise<SystemStorageOperationsDdb> {
        return new SystemStorageOperationsDdb({
            context
        });
    }
}

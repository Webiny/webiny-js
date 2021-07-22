import { UserStorageOperationsProvider } from "@webiny/api-security-admin-users/plugins/UserStorageOperationsProvider";
import { UserStorageOperationsDdb } from "./UserStorageOperations";
import { UserStorageOperations } from "@webiny/api-security-admin-users/types";

export class UserStorageOperationsProviderDdb extends UserStorageOperationsProvider {
    public name = "sau.storageOperationsProvider.system.ddb";

    public async provide({ context }): Promise<UserStorageOperations> {
        return new UserStorageOperationsDdb({
            context
        });
    }
}

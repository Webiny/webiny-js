import { GroupsStorageOperationsProvider } from "@webiny/api-security-admin-users/plugins/GroupsStorageOperationsProvider";
import { GroupsStorageOperationsDdb } from "./GroupsStorageOperations";

export class GroupsStorageOperationsProviderDdb extends GroupsStorageOperationsProvider {
    public name = "sau.storageOperationsProvider.groups.ddb";

    public async provide({ context }): Promise<GroupsStorageOperationsDdb> {
        return new GroupsStorageOperationsDdb({
            context
        });
    }
}

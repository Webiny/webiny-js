import { Plugin } from "@webiny/plugins";
import { AdminUsersContext, GroupsStorageOperations } from "~/types";

interface Params {
    context: AdminUsersContext;
}
export abstract class GroupsStorageOperationsProvider extends Plugin {
    public static readonly type = "sau.storageOperationsProvider.group";

    public abstract provide(params: Params): Promise<GroupsStorageOperations>;
}

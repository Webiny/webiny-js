import { Plugin } from "@webiny/plugins";
import { AdminUsersContext, UserStorageOperations } from "~/types";

interface Params {
    context: AdminUsersContext;
}
export abstract class UserStorageOperationsProvider extends Plugin {
    public static readonly type = "sau.storageOperationsProvider.user";

    public abstract provide(params: Params): Promise<UserStorageOperations>;
}

import { Plugin } from "@webiny/plugins";
import { AdminUsersContext, SystemStorageOperations } from "~/types";

interface Params {
    context: AdminUsersContext;
}
export abstract class SystemStorageOperationsProvider extends Plugin {
    public static readonly type = "sau.storageOperationsProvider.system";

    public abstract provide(params: Params): Promise<SystemStorageOperations>;
}

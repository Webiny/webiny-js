import { Plugin } from "@webiny/plugins";
import { AdminUsersContext, ApiKeyStorageOperations } from "~/types";

interface Params {
    context: AdminUsersContext;
}
export abstract class ApiKeyStorageOperationsProvider extends Plugin {
    public static readonly type = "sau.storageOperationsProvider.apiKey";

    public abstract provide(params: Params): Promise<ApiKeyStorageOperations>;
}

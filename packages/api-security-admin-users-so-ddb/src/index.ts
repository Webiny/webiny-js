import { ApiKeyStorageOperationsProviderDdb } from "~/operations/apiKey";
import { SystemStorageOperationsProviderDdb } from "~/operations/system";
import { GroupsStorageOperationsProviderDdb } from "~/operations/groups";

export default () => [
    new ApiKeyStorageOperationsProviderDdb(),
    new GroupsStorageOperationsProviderDdb(),
    new SystemStorageOperationsProviderDdb()
];

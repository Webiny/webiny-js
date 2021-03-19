import { ContextPlugin } from "@webiny/handler/types";
import filesCRUD from "./crud/files.crud";
import settingsCRUD from "./crud/settings.crud";
import systemCRUD from "./crud/system.crud";
import { FileStorage } from "./FileStorage";
import { FileManagerContext } from "../types";

export default {
    type: "context",
    apply: async context => {
        const { i18nContent, security } = context;
        if (!security.getTenant() || !i18nContent.getLocale()) {
            return;
        }

        // Get file storage plugin. We get it `byName` because we only support 1 storage plugin.
        const fileStoragePlugin = context.plugins.byName("api-file-manager-storage");

        context.fileManager = {
            ...context.fileManager,
            files: filesCRUD(context),
            system: systemCRUD(context),
            settings: settingsCRUD(context),
            storage: new FileStorage({
                storagePlugin: fileStoragePlugin,
                context
            })
        };
    }
} as ContextPlugin<FileManagerContext>;

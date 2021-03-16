import { withFields, string, number, onSet } from "@commodo/fields";
import { validation } from "@webiny/validation";
import defaults from "./utils/defaults";
import { FileManagerContext, Settings, SettingsCRUD } from "~/types";

export const SETTINGS_KEY = "file-manager";

const CreateDataModel = withFields({
    uploadMinFileSize: number({ value: 0, validation: validation.create("gte:0") }),
    uploadMaxFileSize: number({ value: 26214401 }),
    srcPrefix: onSet(value => {
        // Make sure srcPrefix always ends with forward slash.
        if (typeof value === "string") {
            return value.endsWith("/") ? value : value + "/";
        }
        return value;
    })(string({ value: "/files/" }))
})();

const UpdateDataModel = withFields({
    uploadMinFileSize: number({
        validation: validation.create("gte:0")
    }),
    uploadMaxFileSize: number(),
    srcPrefix: onSet(value => {
        // Make sure srcPrefix always ends with forward slash.
        if (typeof value === "string") {
            return value.endsWith("/") ? value : value + "/";
        }
        return value;
    })(string())
})();

export default (context: FileManagerContext): SettingsCRUD => {
    const { db, security } = context;
    const PK_SETTINGS = () => `T#${security.getTenant().id}#FM#SETTINGS`;
    const SK_SETTINGS = () => `default`;

    const cache = {};

    return {
        async getSettings() {
            // Check if the settings is in cache
            if (cache[security.getTenant().id]) {
                return cache[security.getTenant().id];
            }
            // Else fetch settings from DB
            const [[settings]] = await db.read<Settings>({
                ...defaults.db,
                query: { PK: PK_SETTINGS(), SK: SK_SETTINGS() },
                limit: 1
            });
            // And store it into the cache
            cache[security.getTenant().id] = settings;

            return settings;
        },
        async createSettings(data) {
            const settings = new CreateDataModel().populate(data);
            await settings.validate();

            const settingsData: Settings = await settings.toJSON();

            await db.create({
                data: {
                    PK: PK_SETTINGS(),
                    SK: SK_SETTINGS(),
                    TYPE: "fm.settings",
                    ...settingsData
                }
            });

            return settingsData;
        },
        async updateSettings(data) {
            const updatedValue = new UpdateDataModel().populate(data);
            await updatedValue.validate();

            const existingSettings: Settings = await this.getSettings();

            const updatedSettings: Partial<Settings> = await updatedValue.toJSON({
                onlyDirty: true
            });

            await db.update({
                ...defaults,
                query: { PK: PK_SETTINGS(), SK: SK_SETTINGS() },
                data: updatedSettings
            });
            // Remove settings from cache
            cache[security.getTenant().id] = null;

            return { ...existingSettings, ...updatedSettings };
        },
        async deleteSettings() {
            await db.delete({
                ...defaults.db,
                query: { PK: PK_SETTINGS(), SK: SK_SETTINGS() }
            });
            // Remove settings from cache
            cache[security.getTenant().id] = null;

            return true;
        }
    };
};

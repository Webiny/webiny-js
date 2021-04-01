import {
    CmsContext,
    CmsSettings,
    CmsSettingsStorageOperations
} from "@webiny/api-headless-cms/types";
import configurations from "../../configurations";
import WebinyError from "@webiny/error";

interface ConstructorArgs {
    context: CmsContext;
    basePrimaryKey: string;
}
// @ts-ignore
interface CmsSettingsDb extends CmsSettings {
    contentModelLastChange: string;
}

const convertToDbData = (data: CmsSettings): CmsSettingsDb => {
    return {
        ...data,
        contentModelLastChange: data.contentModelLastChange.toISOString()
    };
};

const convertFromDbData = (data?: CmsSettingsDb): CmsSettings | null => {
    if (!data) {
        return null;
    }
    let contentModelLastChange;
    try {
        contentModelLastChange = new Date(data.contentModelLastChange);
    } catch {
        contentModelLastChange = new Date();
    }
    return {
        ...data,
        contentModelLastChange
    };
};

const SETTINGS_SECONDARY_KEY = "settings";

export default class CmsSettingsDynamoElastic implements CmsSettingsStorageOperations {
    private readonly _context: CmsContext;
    private readonly _primaryKey: string;

    private get context(): CmsContext {
        return this._context;
    }

    private get primaryKey(): string {
        return this._primaryKey;
    }

    public constructor({ context, basePrimaryKey }: ConstructorArgs) {
        this._context = context;
        this._primaryKey = `${basePrimaryKey}#SETTINGS`;
    }

    public async get(): Promise<CmsSettings> {
        const { db } = this.context;
        const [[settings]] = await db.read<CmsSettingsDb>({
            ...configurations.db(),
            query: {
                PK: this.primaryKey,
                SK: SETTINGS_SECONDARY_KEY
            }
        });
        if (!settings) {
            return null;
        }
        return convertFromDbData(settings);
    }

    public async create(data: CmsSettings): Promise<void> {
        const { db } = this.context;
        const dbData = convertToDbData(data);
        try {
            await db.create({
                ...configurations.db(),
                data: {
                    PK: this.primaryKey,
                    SK: SETTINGS_SECONDARY_KEY,
                    ...dbData
                }
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not create settings.",
                ex.code || "CREATE_SETTINGS_ERROR",
                {
                    error: ex,
                    data
                }
            );
        }
    }

    public async update(data: CmsSettings): Promise<void> {
        const { db } = this.context;
        try {
            await db.update({
                ...configurations.db(),
                query: {
                    PK: this.primaryKey,
                    SK: SETTINGS_SECONDARY_KEY
                },
                data: convertToDbData(data)
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not update settings.",
                ex.code || "UPDATE_SETTINGS_ERROR",
                {
                    error: ex,
                    data
                }
            );
        }
    }
}

import {
    CmsContentModelGroup,
    CmsContentModelGroupCrud,
    CmsContentModelGroupCrudCreateArgs,
    CmsContentModelGroupCrudDeleteArgs,
    CmsContentModelGroupCrudGetArgs,
    CmsContentModelGroupCrudListArgs,
    CmsContentModelGroupCrudUpdateArgs,
    CmsContext
} from "../../../../../types";
import WebinyError from "@webiny/error";
import * as utils from "../../../../../utils";

const whereKeySuffix = [
    "_not",
    "_not_in",
    "_in",
    "_gt",
    "_gte",
    "_lt",
    "_lte",
    "_not_between",
    "_between"
].join("|");

const removeWhereKeySuffix = (key: string): string => {
    return key.replace(new RegExp(`${whereKeySuffix}$`), "");
};

const compare = (key: string, compareValue: any, value: any): boolean => {
    if (key.endsWith("_not")) {
        return String(value) !== compareValue;
    } else if (key.endsWith("_not_in")) {
        return !compareValue.includes(value);
    } else if (key.endsWith("_in")) {
        return compareValue.includes(value);
    } else if (key.endsWith("_gt")) {
        return value > compareValue;
    } else if (key.endsWith("_gte")) {
        return value >= compareValue;
    } else if (key.endsWith("_lt")) {
        return value < compareValue;
    } else if (key.endsWith("_lte")) {
        return value <= compareValue;
    } else if (key.endsWith("_not_between")) {
        if (!Array.isArray(compareValue) || compareValue.length === 0) {
            throw new WebinyError(`Wrong compareValue for "${key}".`);
        }
        return value < compareValue[0] && value > compareValue[1];
    } else if (key.endsWith("_between")) {
        if (!Array.isArray(compareValue) || compareValue.length === 0) {
            throw new WebinyError(`Wrong compareValue for "${key}".`);
        }
        return value >= compareValue[0] && value <= compareValue[1];
    }
    return compareValue === value;
};

const whereFilterFactory = (where: Record<string, any> = {}) => {
    return model => {
        if (!where) {
            return true;
        }
        for (const key in where) {
            const whereValue = where[key];
            const value = model[removeWhereKeySuffix(key)];
            return compare(key, whereValue, value);
        }
        return true;
    };
};

const createPrimaryKey = ({ security, cms }: CmsContext): string => {
    const tenant = security.getTenant();
    if (!tenant) {
        throw new WebinyError("Tenant missing.", "TENANT_NOT_FOUND");
    }

    const locale = cms.getLocale();
    if (!locale) {
        throw new WebinyError("Locale missing.", "LOCALE_NOT_FOUND");
    }

    return `T#${tenant.id}#L#${locale.code}#CMS`;
};

export default class CmsContentModelGroupCrudImpl implements CmsContentModelGroupCrud {
    private readonly _context: CmsContext;
    private readonly _primaryKey: string;

    private get context(): CmsContext {
        return this._context;
    }

    private get primaryKey(): string {
        return this._primaryKey;
    }

    public constructor({ context }) {
        this._context = context;
        this._primaryKey = createPrimaryKey(context);
    }

    public async create({ data }: CmsContentModelGroupCrudCreateArgs) {
        const { db } = this.context;
        const dbData = {
            PK: this.primaryKey,
            SK: data.id,
            TYPE: "cms.group",
            ...data
        };

        await db.create({
            // TODO there are no defaults like this anymore
            ...utils.defaults.db(),
            data: dbData
        });
        return dbData;
    }
    public async delete({ group }: CmsContentModelGroupCrudDeleteArgs) {
        const { db } = this.context;
        const { id } = group;
        await db.delete({
            ...utils.defaults.db(),
            query: {
                PK: this.primaryKey,
                SK: id
            }
        });
        return true;
    }
    public async get({ id }: CmsContentModelGroupCrudGetArgs) {
        const { db } = this.context;
        const [[group]] = await db.read<CmsContentModelGroup>({
            // TODO there are no defaults like this anymore
            ...utils.defaults.db(),
            query: { PK: this.primaryKey, SK: id }
        });
        return group || null;
    }
    public async list({ where, limit }: CmsContentModelGroupCrudListArgs) {
        const { db } = this.context;
        const [groups] = await db.read<CmsContentModelGroup>({
            // TODO there are no defaults like this anymore
            ...utils.defaults.db(),
            query: {
                PK: this.primaryKey,
                SK: { $gt: " " }
            }
        });

        const whereKeys = Object.keys(where || {});
        if (whereKeys.length === 0) {
            return groups;
        }

        const filteredGroups = groups.filter(whereFilterFactory(where));

        return typeof limit !== "undefined" ? filteredGroups.slice(0, limit) : filteredGroups;
    }

    public async update({ group, data }: CmsContentModelGroupCrudUpdateArgs) {
        const { db } = this.context;
        await db.update({
            // TODO there are no defaults like this anymore
            ...utils.defaults.db(),
            query: { PK: this.primaryKey, SK: group.id },
            data
        });
        return {
            ...group,
            ...data
        };
    }
}
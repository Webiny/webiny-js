import { ContextPlugin } from "@webiny/handler/types";
import { DbContext } from "@webiny/handler-db/types";
import { I18NLocale } from "../../types";
import { TenancyContext } from "@webiny/api-security-tenancy/types";
import getPKPrefix from "./utils/getPKPrefix";

export const dbArgs = {
    table: process.env.DB_TABLE_I18N,
    keys: [
        { primary: true, unique: true, name: "primary", fields: [{ name: "PK" }, { name: "SK" }] }
    ]
};

export default {
    type: "context",
    apply(context) {
        const { db } = context;

        const PK_LOCALE = () => `${getPKPrefix(context)}L`;
        const PK_DEFAULT_LOCALE = () => `${PK_LOCALE()}#D`;

        context.locales = {
            async getByCode(code: string) {
                const [[locale]] = await db.read<I18NLocale>({
                    ...dbArgs,
                    query: { PK: PK_LOCALE(), SK: code },
                    limit: 1
                });

                return locale;
            },
            async getDefault() {
                const [[locale]] = await db.read<I18NLocale>({
                    ...dbArgs,
                    query: { PK: PK_DEFAULT_LOCALE(), SK: "default" },
                    limit: 1
                });

                return locale;
            },
            async list(args) {
                const [locales] = await db.read<I18NLocale>({
                    ...dbArgs,
                    query: { PK: PK_LOCALE(), SK: { $gt: " " } },
                    ...args
                });

                return locales;
            },
            create(data) {
                return db.create({
                    ...dbArgs,
                    data: {
                        PK: PK_LOCALE(),
                        SK: data.code,
                        code: data.code,
                        default: data.default
                    }
                });
            },
            update(code, data) {
                return db.update({
                    ...dbArgs,
                    query: { PK: PK_LOCALE(), SK: code },
                    data: {
                        default: data.default
                    }
                });
            },
            delete(code: string) {
                return db.delete({
                    ...dbArgs,
                    query: { PK: PK_LOCALE(), SK: code },
                    limit: 1
                });
            },

            async updateDefault(code) {
                const defaultLocale = await this.getDefault();
                const batch = db.batch();

                if (defaultLocale) {
                    // No need to update anything if the defaultLocale is already set.
                    if (defaultLocale.code === code) {
                        return;
                    }

                    batch.update({
                        ...dbArgs,
                        query: { PK: PK_DEFAULT_LOCALE(), SK: "default" },
                        data: {
                            PK: PK_DEFAULT_LOCALE(),
                            SK: "default",
                            code
                        }
                    });

                    batch.update({
                        ...dbArgs,
                        query: { PK: PK_LOCALE(), SK: defaultLocale.code },
                        data: {
                            PK: PK_LOCALE(),
                            SK: defaultLocale.code,
                            code: defaultLocale.code,
                            default: false
                        }
                    });
                } else {
                    await db.create({
                        ...dbArgs,
                        data: {
                            PK: PK_DEFAULT_LOCALE(),
                            SK: "default",
                            code
                        }
                    });
                }

                batch.update({
                    ...dbArgs,
                    query: { PK: PK_LOCALE(), SK: code },
                    data: {
                        PK: PK_LOCALE(),
                        SK: code,
                        code: code,
                        default: true
                    }
                });

                return await batch.execute();
            }
        };
    }
} as ContextPlugin<DbContext, TenancyContext>;

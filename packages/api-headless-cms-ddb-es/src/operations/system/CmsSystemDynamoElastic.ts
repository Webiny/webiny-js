import { CmsContext, CmsSystem, CmsSystemStorageOperations } from "@webiny/api-headless-cms/types";
import configurations from "../../configurations";
import WebinyError from "@webiny/error";
export const createBasePartitionKey = ({ security }: CmsContext): string => {
    const tenant = security.getTenant();
    if (!tenant) {
        throw new WebinyError("Tenant missing.", "TENANT_NOT_FOUND");
    }

    return `T#${tenant.id}`;
};

interface ConstructorArgs {
    context: CmsContext;
}

const SYSTEM_SECONDARY_KEY = "CMS";

export default class CmsSystemDynamoElastic implements CmsSystemStorageOperations {
    private readonly _context: CmsContext;
    private _partitionKey: string;

    private get context(): CmsContext {
        return this._context;
    }

    private get partitionKey(): string {
        if (!this._partitionKey) {
            const tenant = this._context.security.getTenant();
            if (!tenant) {
                throw new WebinyError("Tenant missing.", "TENANT_NOT_FOUND");
            }
            this._partitionKey = `T#${tenant.id}#SYSTEM`;
        }
        return this._partitionKey;
    }

    public constructor({ context }: ConstructorArgs) {
        this._context = context;
    }

    public async get(): Promise<CmsSystem> {
        const { db } = this.context;
        const [[system]] = await db.read<CmsSystem>({
            ...configurations.db(),
            query: {
                PK: this.partitionKey,
                SK: SYSTEM_SECONDARY_KEY
            }
        });

        return system || null;
    }

    public async create(data: CmsSystem): Promise<void> {
        const { db } = this.context;
        try {
            await db.create({
                ...configurations.db(),
                data: {
                    PK: this.partitionKey,
                    SK: SYSTEM_SECONDARY_KEY,
                    ...data
                }
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not create system.",
                ex.code || "CREATE_SYSTEM_ERROR",
                {
                    error: ex,
                    data
                }
            );
        }
    }

    public async update(data: CmsSystem): Promise<void> {
        const { db } = this.context;
        try {
            await db.update({
                ...configurations.db(),
                query: {
                    PK: this.partitionKey,
                    SK: SYSTEM_SECONDARY_KEY
                },
                data
            });
        } catch (ex) {
            throw new WebinyError(
                ex.message || "Could not update system.",
                ex.code || "UPDATE_SYSTEM_ERROR",
                {
                    error: ex,
                    data
                }
            );
        }
    }

    public async beforeInstall(): Promise<void> {
        const { elasticSearch } = this.context;
        try {
            await elasticSearch.indices.putTemplate({
                name: "headless-cms-entries-index",
                body: {
                    index_patterns: ["*headless-cms*"],
                    settings: {
                        analysis: {
                            analyzer: {
                                lowercase_analyzer: {
                                    type: "custom",
                                    filter: ["lowercase", "trim"],
                                    tokenizer: "keyword"
                                }
                            }
                        }
                    },
                    mappings: {
                        properties: {
                            property: {
                                type: "text",
                                fields: {
                                    keyword: {
                                        type: "keyword",
                                        ignore_above: 256
                                    }
                                },
                                analyzer: "lowercase_analyzer"
                            },
                            rawValues: {
                                type: "object",
                                enabled: false
                            }
                        }
                    }
                }
            });
        } catch (err) {
            console.log(err);
            throw new WebinyError(
                "Index template creation failed!",
                "CMS_INSTALLATION_INDEX_TEMPLATE_ERROR"
            );
        }
    }
}
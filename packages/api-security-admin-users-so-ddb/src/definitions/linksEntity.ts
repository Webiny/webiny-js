import { Entity, Table } from "dynamodb-toolbox";
import { AdminUsersContext } from "@webiny/api-security-admin-users/types";
import { getExtraAttributes } from "@webiny/db-dynamodb/utils/attributes";

interface Params {
    context: AdminUsersContext;
    table: Table;
}
export const createLinksEntity = (params: Params): Entity<any> => {
    const { context, table } = params;
    const entityName = "User2Tenant";
    const attributes = getExtraAttributes(context, entityName);
    return new Entity({
        table,
        name: entityName,
        attributes: {
            PK: {
                partitionKey: true
            },
            SK: {
                sortKey: true
            },
            TYPE: {
                type: "string"
            },
            tenant: {
                type: "map"
            },
            group: {
                type: "map"
            },
            ...attributes
        }
    });
};

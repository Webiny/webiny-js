import { Entity, Table } from "dynamodb-toolbox";
import { AdminUsersContext } from "@webiny/api-security-admin-users/types";
import { getExtraAttributes } from "@webiny/db-dynamodb/utils/attributes";

interface Params {
    context: AdminUsersContext;
    table: Table;
}
export const createSystemEntity = (params: Params): Entity<any> => {
    const { context, table } = params;
    const entityName = "System";
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
            version: {
                type: "string"
            },
            ...attributes
        }
    });
};

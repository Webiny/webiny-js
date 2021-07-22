import { Entity, Table } from "dynamodb-toolbox";
import { AdminUsersContext } from "@webiny/api-security-admin-users/types";
import { getExtraAttributes } from "@webiny/db-dynamodb/utils/attributes";

interface Params {
    context: AdminUsersContext;
    table: Table;
}
export const createTokenEntity = (params: Params): Entity<any> => {
    const { context, table } = params;
    const entityName = "Token";
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
            GSI1_PK: {
                type: "string"
            },
            GSI1_SK: {
                type: "string"
            },
            TYPE: {
                type: "string"
            },
            id: {
                type: "string"
            },
            name: {
                type: "string"
            },
            token: {
                type: "string"
            },
            login: {
                type: "string"
            },
            createdOn: {
                type: "string"
            },
            ...attributes
        }
    });
};

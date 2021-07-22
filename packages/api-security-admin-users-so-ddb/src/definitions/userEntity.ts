import { Entity, Table } from "dynamodb-toolbox";
import { AdminUsersContext } from "@webiny/api-security-admin-users/types";
import { getExtraAttributes } from "@webiny/db-dynamodb/utils/attributes";

interface Params {
    context: AdminUsersContext;
    table: Table;
}
export const createUserEntity = (params: Params): Entity<any> => {
    const { context, table } = params;
    const entityName = "User";
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
            id: {
                type: "string"
            },
            login: {
                type: "string"
            },
            firstName: {
                type: "string"
            },
            lastName: {
                type: "string"
            },
            avatar: {
                type: "map"
            },
            createdBy: {
                type: "map"
            },
            createdOn: {
                type: "string"
            },
            ...attributes
        }
    });
};

import { Entity, Table } from "dynamodb-toolbox";
import { AdminUsersContext } from "@webiny/api-security-admin-users/types";
import { getExtraAttributes } from "@webiny/db-dynamodb/utils/attributes";

interface Params {
    context: AdminUsersContext;
    table: Table;
}
export const createGroupEntity = (params: Params): Entity<any> => {
    const { context, table } = params;
    const entityName = "Group";
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
            tenant: {
                type: "string"
            },
            system: {
                type: "boolean"
            },
            createdBy: {
                type: "map"
            },
            createdOn: {
                type: "string"
            },
            name: {
                type: "string"
            },
            slug: {
                type: "string"
            },
            description: {
                type: "string"
            },
            permissions: {
                type: "map"
            },
            ...attributes
        }
    });
};

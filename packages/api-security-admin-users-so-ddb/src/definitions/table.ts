import { AdminUsersContext } from "@webiny/api-security-admin-users/types";
import { Table } from "dynamodb-toolbox";
import configurations from "~/configurations";
import { getDocumentClient, getTable } from "~/utils";

interface Params {
    context: AdminUsersContext;
}
export const createTable = ({ context }: Params) => {
    return new Table({
        name: configurations.db().table || getTable(context),
        partitionKey: "PK",
        sortKey: "SK",
        DocumentClient: getDocumentClient(context),
        indexes: {
            GSI1: {
                partitionKey: "GSI1_PK",
                sortKey: "GSI1_SK"
            }
        }
    });
};

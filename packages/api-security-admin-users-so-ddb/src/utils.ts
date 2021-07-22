import WebinyError from "@webiny/error";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { AdminUsersContext } from "@webiny/api-security-admin-users/types";

export const getDocumentClient = (context: AdminUsersContext): DocumentClient => {
    const driver = context.db.driver as any;
    if (!driver || !driver.documentClient) {
        throw new WebinyError(
            `Missing documentDriver on the context db.driver property.`,
            "DOCUMENT_CLIENT_ERROR"
        );
    }
    return driver.documentClient;
};

export const getTable = (context: AdminUsersContext): string => {
    const db = context.db as any;
    if (!db) {
        throw new WebinyError("Missing db on context.", "DB_ERROR");
    } else if (!db.table) {
        throw new WebinyError("Missing table on context.db.", "TABLE_ERROR");
    }
    return db.table;
};

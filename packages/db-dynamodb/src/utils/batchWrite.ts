import { Table } from "dynamodb-toolbox";
import lodashChunk from "lodash.chunk";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

interface Item {
    [key: string]: DocumentClient.WriteRequest;
}
interface Params {
    table: Table;
    items: Item[];
}

/**
 * Method is meant for batch writing to a single table.
 * It expects already prepared items for the write.
 * It can either delete or put items
 * The method does not check items before actually sending them into the underlying library.
 */
export const batchWriteAll = async (params: Params, maxChunk = 25): Promise<void> => {
    const chunkedItems: Item[][] = lodashChunk(params.items, maxChunk);
    for (const items of chunkedItems) {
        await params.table.batchWrite(items);
    }
};

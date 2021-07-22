import { Table } from "dynamodb-toolbox";

interface Item {
    Table: Table;
    Key: any;
}
interface Params {
    table: Table;
    items: Item[];
}

const flatten = (responses: Record<string, any[]>): any[] => {
    const entries = [];
    const values = Object.values(responses);
    for (const items of values) {
        entries.push(...items);
    }
    return entries;
};
/**
 * This helper function is meant to be used to batch read from one table.
 * It will fetch all results, as there is a next() method call built in.
 */
export const batchReadAll = async <T = any>(params: Params): Promise<T[]> => {
    const items: T[] = [];
    const result = await params.table.batchGet(params.items);

    if (result.Responses) {
        items.push(...flatten(result.Responses));
    }

    if (typeof result.next === "function") {
        let previous = result;
        let nextResult;
        while ((nextResult = await previous.next())) {
            if (!nextResult) {
                return items;
            }
            items.push(...flatten(nextResult.Responses));
            if (!nextResult || typeof nextResult.next !== "function") {
                return items;
            }
            previous = nextResult;
        }
    }

    return items;
};

import { queryOptions as DynamoDBToolboxQueryOptions } from "dynamodb-toolbox/dist/classes/Table";
import WebinyError from "@webiny/error";
import { Entity } from "dynamodb-toolbox";

export interface QueryAllParams {
    entity: Entity<any>;
    partitionKey: string;
    options?: DynamoDBToolboxQueryOptions;
}

export interface QueryOneParams extends QueryAllParams {
    options?: Omit<DynamoDBToolboxQueryOptions, "limit">;
}

export interface QueryParams extends QueryAllParams {
    previous?: any;
}

export interface QueryResult<T> {
    result: any | null;
    items: T[];
}

/**
 * Will run query only once. Pass the previous to run the query again to fetch new data.
 * It returns the result and the items it found.
 * Result is required to fetch the items that were not fetched in the previous run.
 */
const query = async <T>(params: QueryParams): Promise<QueryResult<T>> => {
    const { entity, previous, partitionKey, options } = params;
    let result;
    /**
     * In case there is no previous result we must make a new query.
     * This is the first query on the given partition key.
     */
    if (!previous) {
        result = await entity.query(partitionKey, options);
    } else if (typeof previous.next === "function") {
        /**
         * In case we have a previous result and it has a next method, we run it.
         * In case result of the next method is false, it means it has nothing else to read
         * and we return a null to keep the query from repeating.
         */
        result = await previous.next();
        if (result === false) {
            return {
                result: null,
                items: []
            };
        }
    } else {
        /**
         * This could probably never happen but keep it here just in case to break the query loop.
         * Basically, either previous does not exist or it exists and it does not have the next method
         * and at that point a result returned will be null and loop should not start again.
         */
        return {
            result: null,
            items: []
        };
    }
    /**
     * We expect the result to contain an Items array and if not, something went wrong, very wrong.
     */
    if (!result || !result.Items || !Array.isArray(result.Items)) {
        throw new WebinyError(
            "Error when querying for content entries - no result.",
            "QUERY_ERROR",
            {
                partitionKey,
                options
            }
        );
    }
    return {
        result,
        items: result.Items
    };
};
/**
 * Will run the query to fetch the first possible item from the database.
 */
export const queryOne = async <T>(params: QueryOneParams): Promise<T | null> => {
    const { items } = await query<T>({
        ...params,
        options: {
            ...(params.options || {}),
            limit: 1
        }
    });
    return items[0] || null;
};
/**
 * Will run the query to fetch the results no matter how much iterations it needs to go through.
 */
export const queryAll = async <T>(params: QueryAllParams): Promise<T[]> => {
    const items: T[] = [];
    let results: QueryResult<T>;
    let previousResult: any = undefined;
    while ((results = await query({ ...params, previous: previousResult }))) {
        items.push(...results.items);
        if (!results.result) {
            return items;
        }
        previousResult = results.result;
    }
    return items;
};

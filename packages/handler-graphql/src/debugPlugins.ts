import { ContextInterface, ContextPlugin } from "@webiny/handler/types";
import { customAlphabet } from "nanoid";
import { interceptConsole } from "./interceptConsole";
import { GraphQLAfterQueryPlugin, GraphQLBeforeQueryPlugin } from "./types";

interface DebugContext extends ContextInterface {
    debug: {
        logs?: { method: string; args: any; meta: { requestId: string; timestamp: number } }[];
    };
}

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(ALPHANUMERIC, 10);

export default () => [
    {
        type: "context",
        apply(context) {
            const requestId = nanoid();

            context.debug = context.debug || {};
            context.debug.logs = [];

            interceptConsole((method, args) => {
                context.debug.logs.push({
                    method,
                    args,
                    meta: { requestId, timestamp: Date.now() }
                });
            });
        }
    } as ContextPlugin<DebugContext>,
    {
        type: "graphql-before-query",
        apply({ context }) {
            // Empty logs
            context.debug.logs = [];
            console.log("GraphQL START")
        }
    } as GraphQLBeforeQueryPlugin<DebugContext>,
    {
        type: "graphql-after-query",
        apply({ result, context }) {
            console.log("GraphQL END")
            result["extensions"] = { console: context.debug.logs || [] };
        }
    } as GraphQLAfterQueryPlugin<DebugContext>
];

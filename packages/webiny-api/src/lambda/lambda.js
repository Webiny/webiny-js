// @flow
import { ApolloServer } from "apollo-server-lambda";
import { applyMiddleware } from "graphql-middleware";
import type { GraphQLMiddlewarePluginType } from "webiny-api/types";
import { prepareSchema, createGraphqlRunner } from "../graphql/schema";
import setup from "./setup";
import { getPlugins } from "webiny-plugins";
import debug from "debug";

export const log = debug("webiny");

const createApolloHandler = async (config: Object) => {
    await setup(config);
    let { schema, context } = prepareSchema();

    const registeredMiddleware: Array<GraphQLMiddlewarePluginType> = [];

    log('createApolloHandler:mw:start')
    const middlewarePlugins = getPlugins("graphql-middleware");
    for (let i = 0; i < middlewarePlugins.length; i++) {
        let plugin = middlewarePlugins[i];
        const middleware =
            typeof plugin.middleware === "function"
                ? await plugin.middleware({ context, config })
                : plugin.middleware;
        if (Array.isArray(middleware)) {
            registeredMiddleware.push(...middleware);
        } else {
            registeredMiddleware.push(middleware);
        }
    }
    log('createApolloHandler:mw:end')
    
    config.middleware && registeredMiddleware.push(config.middleware);

    if (registeredMiddleware.length) {
        schema = applyMiddleware(schema, ...registeredMiddleware);
    }

    const apollo = new ApolloServer({
        schema,
        cors: {
            origin: "*",
            methods: "GET,HEAD,POST"
        },
        context: ({ event, context: { token, user } }) => {
            let ctx = {
                event,
                config,
                user,
                token
            };

            ctx = { ...ctx, ...context(ctx) };

            // Add `runQuery` function to be able to easily run queries against schemas from within a resolver
            ctx.graphql = createGraphqlRunner(schema, ctx);
            return ctx;
        }
    });

    return apollo.createHandler();
};

function getErrorResponse(error: Error & Object) {
    return {
        body: JSON.stringify({
            errors: [{ code: error.code, message: error.message }]
        }),
        statusCode: 200,
        headers: { "Content-Type": "application/json" }
    };
}

let handler = null;

export const createHandler = (config: () => Promise<Object>) => {
    log("createHandler:start");
    return async (event: Object, context: Object) => {
        config = await config();
        return await new Promise(async (resolve, reject) => {
            if (!handler) {
                try {
                    log("createApolloHandler:before");
                    handler = await createApolloHandler(config);
                    log("createApolloHandler:after");
                } catch (e) {
                    if (process.env.NODE_ENV === "development") {
                        console.log(e); // eslint-disable-line
                    }
                    return resolve(getErrorResponse(e));
                }
            }

            const securityPlugins = getPlugins("security");
            for (let i = 0; i < securityPlugins.length; i++) {
                let securityPlugin = securityPlugins[i];
                try {
                    await securityPlugin.authenticate(config, event, context);
                } catch (e) {
                    return resolve(getErrorResponse(e));
                }
            }
            log("security plugins:done");

            handler(event, context, (error, data) => {
                if (error) {
                    return reject(error);
                }

                if (process.env.NODE_ENV === "development") {
                    data.body = JSON.stringify(JSON.parse(data.body), null, 2);
                }

                log("resolve:data");
                resolve(data);
            });
        });
    };
};

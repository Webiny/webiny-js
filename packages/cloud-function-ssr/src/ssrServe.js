import qs from "querystringify";
import LambdaClient from "aws-sdk/clients/lambda";
import { createResponse } from "@webiny/cloud-function";
import mime from "mime-types";
import { getSsrHtml } from "./functions";

export default options => {
    if (options.cache.enabled) {
        return {
            type: "handler",
            name: "handler-ssr-with-cache",
            canHandle({ args }) {
                const [event] = args;
                return event.httpMethod === "GET" && !mime.lookup(event.path);
            },
            async handle({ args, context }) {
                const [event] = args;
                const path = event.path + qs.stringify(event.multiValueQueryStringParameters, true);

                const { SsrCache } = context.models;
                let ssrCache = await SsrCache.findByPath(path);
                if (!ssrCache) {
                    ssrCache = new SsrCache();
                    ssrCache.path = path;
                    await ssrCache.save();
                }

                if (ssrCache.isEmpty) {
                    await ssrCache.refresh();
                } else if (ssrCache.hasExpired) {
                    // On expiration, asynchronously trigger SSR cache refreshing.
                    // This will only increment expiresOn for the "options.cache.staleTtl" seconds, which
                    // is a short duration, enough for the actual refresh to complete, which will again update the
                    // expiration. Default value of "options.cache.staleTtl" is 20 seconds.
                    await ssrCache.incrementExpiresOn().save();
                    const Lambda = new LambdaClient({ region: process.env.AWS_REGION });
                    await Lambda.invoke({
                        FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
                        InvocationType: "Event",
                        Payload: JSON.stringify({
                            ...event,
                            httpMethod: "POST",
                            body: ["refreshSsrCache", { path: ssrCache.path }]
                        })
                    }).promise();
                }

                return createResponse({
                    type: "text/html",
                    body: ssrCache.content,
                    headers: { "Cache-Control": "public, max-age=" + ssrCache.expiresIn / 1000 }
                });
            }
        };
    }

    return {
        type: "handler",
        name: "handler-ssr-no-cache",
        canHandle({ args }) {
            const [event] = args;
            return event.httpMethod === "GET" && !mime.lookup(event.path);
        },
        async handle({ args }) {
            const [event] = args;
            const path = event.path + qs.stringify(event.multiValueQueryStringParameters, true);
            const body = await getSsrHtml(options.ssrFunction, { path });
            return createResponse({
                type: "text/html",
                body,
                headers: { "Cache-Control": "no-store" }
            });
        }
    };
};

import { RenderHookPlugin } from "@webiny/api-prerendering-service/render/types";
import CloudFront from "aws-sdk/clients/cloudfront";
import url from "url";

// This plugin will issue a cache invalidation request to CloudFront, every time a page has been rendered. This is
// mostly important when a user publishes a new page, and we want to make the page immediately publicly available.
export default () => {
    return {
        type: "ps-render-hook",
        afterRender: async ({ configuration, args }) => {
            // Let's create a cache invalidation request.
            console.log("Trying to send a CloudFront cache invalidation request...");

            let distributionId = args?.configuration?.meta?.cloudfront?.distributionId;
            if (!distributionId) {
                distributionId = configuration?.meta?.cloudfront?.distributionId;
            }

            if (!distributionId) {
                console.log(`Exiting... CloudFront "distributionId" not provided.`);
                return;
            }

            console.log("Trying to get the path that needs to be invalidated...");
            let path = args.path;
            if (!path) {
                console.log(
                    `Path wasn't passed via "args.path", trying to extract it from "args.url"...`
                );
                path = url.parse(args.url).pathname;
            }

            if (!path) {
                console.log(`Aborting the cache invalidation attempt... "path" not detected.`);
                return;
            }

            path += "*";

            console.log(
                `Proceeding with issuing a cache invalidation request to CloudFront distribution "${distributionId}", path "${path}".`
            );

            const cloudfront = new CloudFront();
            try {
                await cloudfront
                    .createInvalidation({
                        DistributionId: distributionId,
                        InvalidationBatch: {
                            CallerReference: `${new Date().getTime()}-api-prerender-service-aws-after-render`,
                            Paths: {
                                Quantity: 1,
                                Items: [path]
                            }
                        }
                    })
                    .promise();
            } catch (e) {
                // eslint-disable-next-line
                console.log(
                    `Failed to issue a cache invalidation request to CloudFront distribution "${distributionId}".`,
                    e.stack
                );
            }

            console.log(`Cache invalidation request (path "${path}") successfully issued.`);
        }
    } as RenderHookPlugin;
};

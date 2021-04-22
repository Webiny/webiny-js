import chromium from "chrome-aws-lambda";
import posthtml from "posthtml";
import { noopener } from "posthtml-noopener";
import injectApolloState from "./injectApolloState";
import injectRenderId from "./injectRenderId";
import injectRenderTs from "./injectRenderTs";
import injectTenantLocale from "./injectTenantLocale";
import getPsTags from "./getPsTags";
import shortid from "shortid";
import { Args as BaseHandlerArgs, Configuration, HandlerContext } from "./types";

const windowSet = (page, name, value) => {
    page.evaluateOnNewDocument(`
    Object.defineProperty(window, '${name}', {
      get() {
        return '${value}'
      }
    })`);
};

export type File = { type: string; body: any; name: string; meta: Record<string, any> };

export default async (url: string, args: Args): Promise<[File[], Meta]> => {
    const id = shortid.generate();
    const ts = new Date().getTime();

    console.log(`Rendering "${url}" (render ID: ${id})...`);

    const renderUrl =
        typeof args.renderUrlFunction === "function"
            ? args.renderUrlFunction
            : defaultRenderUrlFunction;
    const render = await renderUrl(url, args);

    // Process HTML.
    // TODO: should be plugins (will also eliminate lower @ts-ignore instructions).
    console.log("Processing HTML...");

    const allArgs = { render, args, url, id, ts };
    const { html } = await posthtml([
        noopener(),
        // @ts-ignore
        injectRenderId(allArgs),
        // @ts-ignore
        injectRenderTs(allArgs),
        // @ts-ignore
        injectApolloState(allArgs),
        // @ts-ignore
        injectTenantLocale(allArgs)
    ]).process(render.content);

    console.log("Processing HTML done.");

    console.log(`Rendering "${url}" completed.`);

    // TODO: should be plugins.
    return [
        [
            {
                name: "index.html",
                body: html,
                type: "text/html",
                meta: {
                    tags: getPsTags(html)
                }
            },
            {
                name: "graphql.json",
                body: JSON.stringify(render.meta.gqlCache),
                type: "application/json",
                meta: {}
            }
        ],
        allArgs
    ];
};

let browser;

type RenderResult = {
    content: string;
    meta: Record<string, any>;
};

type Args = {
    context: HandlerContext;
    args: BaseHandlerArgs;
    configuration: Configuration;
    renderUrlFunction?: (url: string) => RenderResult;
};

type Meta = {
    url: string;
    id: string;
    ts: number;
    render: RenderResult;
    args: Args;
};

export const defaultRenderUrlFunction = async (url: string, args: Args): Promise<RenderResult> => {
    if (!browser) {
        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true
        });
    }

    const browserPage = await browser.newPage();

    // Can be used to add additional logic - e.g. skip a GraphQL query to be made when in pre-rendering process.
    windowSet(browserPage, "__PS_RENDER__", true);

    const tenant = args?.args?.configuration?.meta?.tenant;
    if (tenant) {
        console.log("Setting tenant (__PS_RENDER_TENANT__) to window object....");
        windowSet(browserPage, "__PS_RENDER_TENANT__", tenant);
    }

    const locale = args?.args?.configuration?.meta?.locale;
    if (locale) {
        console.log("Setting locale (__PS_RENDER_LOCALE__) to window object....");
        windowSet(browserPage, "__PS_RENDER_LOCALE__", locale);
    }

    // Don't load these resources during prerender.
    const skipResources = ["image", "stylesheet"];
    await browserPage.setRequestInterception(true);

    const gqlCache = [];

    browserPage.on("request", request => {
        if (skipResources.includes(request.resourceType())) {
            request.abort();
        } else {
            request.continue();
        }
    });

    // TODO: should be a plugin.
    browserPage.on("response", async response => {
        const request = response.request();
        const url = request.url();
        if (url.includes("/graphql") && request.method() === "POST") {
            const responses = await response.json();
            const postData = JSON.parse(request.postData());
            const operations = Array.isArray(postData) ? postData : [postData];

            for (let i = 0; i < operations.length; i++) {
                const { operationName, query, variables } = operations[i];

                if (operationName === "PbGetPublishedPage") {
                    gqlCache.push({
                        query,
                        variables,
                        data: responses[i].data
                    });
                }
            }
            return;
        }
    });

    // Load URL and wait for all network requests to settle.
    await browserPage.goto(url, { waitUntil: "networkidle0" });

    const apolloState = await browserPage.evaluate(() => {
        // @ts-ignore
        return window.getApolloState();
    });

    return {
        content: await browserPage.content(),
        // TODO: ideally, meta should be assigned here in a more "plugins style" way, not hardcoded.
        meta: {
            gqlCache,
            apolloState
        }
    };
};

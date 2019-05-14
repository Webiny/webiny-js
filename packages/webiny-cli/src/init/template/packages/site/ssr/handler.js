import "cross-fetch/polyfill";
import "url-search-params-polyfill";
import React from "react";
import { ApolloProvider } from "react-apollo";
import { StaticRouter } from "react-router-dom";
import ReactDOMServer from "react-dom/server";
import Helmet from "react-helmet";
import { getDataFromTree } from "react-apollo";
import ApolloClient from "apollo-client";
import { ApolloLink } from "apollo-link";
import { InMemoryCache } from "apollo-cache-inmemory";
import { BatchHttpLink } from "apollo-link-batch-http";

import Html from "./Html";
import assets from "./assets";
import App from "../src/App";

const createClient = ({ headers }) => {
    return new ApolloClient({
        ssrMode: true,
        link: ApolloLink.from([
            new BatchHttpLink({
                uri: process.env.REACT_APP_FUNCTIONS_HOST + "/function/api",
                credentials: "same-origin",
                headers
            })
        ]),
        cache: new InMemoryCache({
            addTypename: true,
            dataIdFromObject: obj => obj.id || null
        })
    });
};

export const handler = async event => {
    const client = createClient(event);

    const app = (
        <ApolloProvider client={client}>
            <StaticRouter location={event.path} context={{}}>
                <App />
            </StaticRouter>
        </ApolloProvider>
    );

    // Executes all graphql queries for the current state of application
    await getDataFromTree(app);
    const content = ReactDOMServer.renderToStaticMarkup(app);
    const state = client.extract();
    const helmet = Helmet.renderStatic();
    const html = ReactDOMServer.renderToStaticMarkup(
        <Html content={content} helmet={helmet} assets={assets} state={state} />
    );

    return `<!DOCTYPE html>${html}`;
};

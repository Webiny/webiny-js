import { createHandler } from "@webiny/handler-aws";
import apolloServerPlugins from "@webiny/handler-graphql";
import formBuilderPlugins from "@webiny/api-form-builder/plugins";
import securityPlugins from "@webiny/api-security/authenticator";
import dbPlugins from "@webiny/handler-db";
import i18nContext from "@webiny/api-i18n/plugins/context";
import i18nContentPlugins from "@webiny/api-i18n-content/plugins";
import { mockLocalesPlugins } from "@webiny/api-i18n/testing";
import { DynamoDbDriver } from "@webiny/db-dynamodb";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { SecurityIdentity } from "@webiny/api-security";
import elasticSearch from "@webiny/api-plugin-elastic-search-client";
import { Client } from "@elastic/elasticsearch";
// Graphql
import {
    GET_SETTINGS,
    UPDATE_SETTINGS,
    INSTALL,
    IS_INSTALLED
} from "./graphql/formBuilderSettings";
import {
    CREATE_FROM,
    CREATE_REVISION_FROM,
    DELETE_FORM,
    UPDATE_REVISION,
    PUBLISH_REVISION,
    UNPUBLISH_REVISION,
    DELETE_REVISION,
    SAVE_FORM_VIEW,
    GET_FORM,
    LIST_FORMS,
    LIST_PUBLISHED_FORMS,
    GET_PUBLISHED_FORM
} from "./graphql/forms";
import {
    CREATE_FROM_SUBMISSION,
    GET_FROM_SUBMISSION,
    LIST_FROM_SUBMISSION,
    EXPORT_FROM_SUBMISSION
} from "./graphql/formSubmission";

export default ({ permissions, identity } = {}) => {
    const handler = createHandler(
        dbPlugins({
            table: "FormBuilder",
            driver: new DynamoDbDriver({
                documentClient: new DocumentClient({
                    convertEmptyValues: true,
                    endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
                    sslEnabled: false,
                    region: "local"
                })
            })
        }),
        elasticSearch({ endpoint: `http://localhost:9201` }),
        apolloServerPlugins(),
        securityPlugins(),
        i18nContext,
        i18nContentPlugins(),
        mockLocalesPlugins(),
        formBuilderPlugins(),
        {
            type: "security-authorization",
            name: "security-authorization",
            getPermissions: () => permissions || [{ name: "*" }]
        },
        {
            type: "security-authentication",
            authenticate: () =>
                identity ||
                new SecurityIdentity({
                    id: "mocked",
                    displayName: "m"
                })
        }
    );

    // Let's also create the "invoke" function. This will make handler invocations in actual tests easier and nicer.
    const invoke = async ({ httpMethod = "POST", body, headers = {}, ...rest }) => {
        const response = await handler({
            httpMethod,
            headers,
            body: JSON.stringify(body),
            ...rest
        });

        // The first element is the response body, and the second is the raw response.
        return [JSON.parse(response.body), response];
    };

    return {
        elasticSearch: new Client({
            hosts: [`http://localhost:9201`],
            node: "http://localhost:9201"
        }),
        sleep: (ms = 100) => {
            return new Promise(resolve => {
                setTimeout(resolve, ms);
            });
        },
        handler,
        invoke,
        // Form builder settings
        async updateSettings(variables) {
            return invoke({ body: { query: UPDATE_SETTINGS, variables } });
        },
        async getSettings(variables) {
            return invoke({ body: { query: GET_SETTINGS, variables } });
        },
        // Install Form builder
        async install(variables) {
            return invoke({ body: { query: INSTALL, variables } });
        },
        async isInstalled(variables) {
            return invoke({ body: { query: IS_INSTALLED, variables } });
        },
        // Forms
        async createForm(variables) {
            return invoke({ body: { query: CREATE_FROM, variables } });
        },
        async createRevisionFrom(variables) {
            return invoke({ body: { query: CREATE_REVISION_FROM, variables } });
        },
        async deleteForm(variables) {
            return invoke({ body: { query: DELETE_FORM, variables } });
        },
        async updateRevision(variables) {
            return invoke({ body: { query: UPDATE_REVISION, variables } });
        },
        async publishRevision(variables) {
            return invoke({ body: { query: PUBLISH_REVISION, variables } });
        },
        async unpublishRevision(variables) {
            return invoke({ body: { query: UNPUBLISH_REVISION, variables } });
        },
        async deleteRevision(variables) {
            return invoke({ body: { query: DELETE_REVISION, variables } });
        },
        async saveFormView(variables) {
            return invoke({ body: { query: SAVE_FORM_VIEW, variables } });
        },
        async getForm(variables) {
            return invoke({ body: { query: GET_FORM, variables } });
        },
        async getPublishedForm(variables) {
            return invoke({ body: { query: GET_PUBLISHED_FORM, variables } });
        },
        async listForms(variables) {
            return invoke({ body: { query: LIST_FORMS, variables } });
        },
        async listPublishedForms(variables) {
            return invoke({ body: { query: LIST_PUBLISHED_FORMS, variables } });
        },
        // Form Submission
        async createFormSubmission(variables) {
            return invoke({ body: { query: CREATE_FROM_SUBMISSION, variables } });
        },
        async getFormSubmission(variables) {
            return invoke({ body: { query: GET_FROM_SUBMISSION, variables } });
        },
        async listFormSubmission(variables) {
            return invoke({ body: { query: LIST_FROM_SUBMISSION, variables } });
        },
        async exportFormSubmission(variables) {
            return invoke({ body: { query: EXPORT_FROM_SUBMISSION, variables } });
        }
    };
};

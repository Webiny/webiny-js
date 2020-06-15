import { createHandler } from "@webiny/handler";
import headlessCmsHandler from "@webiny/api-headless-cms/content";
import neDb from "@webiny/api-plugin-commodo-nedb";
import { Database } from "@commodo/fields-storage-nedb";
import securityServicePlugins from "@webiny/api-security/plugins/service";
import i18n from "@webiny/api-i18n/plugins/i18n";
import { mockLocalesPlugins } from "@webiny/api-i18n/testing";

import getData from "./useContentHandler/getData";
import { dataManagerPlugins } from "../mocks/dataManagerClient";
import {
    GET_CONTENT_MODEL_BY_MODEL_ID,
    CREATE_CONTENT_MODEL,
    UPDATE_CONTENT_MODEL,
    GET_CONTENT_MODEL,
    DELETE_CONTENT_MODEL,
    createCreateMutation,
    createListQuery,
    createDeleteMutation,
    createUpdateMutation,
    createPublishMutation,
    createListRevisionsQuery,
    createReadQuery,
    createCreateFromMutation,
    createUnpublishMutation
} from "./useContentHandler/graphql";

export default ({ database, type = "manage" } = {}) => {
    if (!database) {
        database = new Database();
    }

    const cmsHandler = createHandler(
        neDb({ database }),
        securityServicePlugins({
            token: {
                secret: "secret"
            }
        }),
        i18n,
        mockLocalesPlugins(),
        headlessCmsHandler(),
        dataManagerPlugins()
    );

    const invoke = async ({ httpMethod = "POST", body, headers = {}, ...rest }) => {
        const response = await cmsHandler({
            httpMethod,
            headers,
            body: JSON.stringify(body),
            ...rest
        });

        return [JSON.parse(response.body), response];
    };

    return {
        database,
        cmsHandler,
        invoke,
        environment: environmentId => {
            const environmentApi = {
                async invoke(args) {
                    if (!args.pathParameters) {
                        args.pathParameters = {};
                    }

                    args.pathParameters.key = `${type}/${environmentId}`;

                    return invoke(args);
                },
                async createContentModel(variables) {
                    const [body] = await environmentApi.invoke({
                        body: {
                            query: CREATE_CONTENT_MODEL,
                            variables
                        }
                    });

                    return getData(body);
                },
                async updateContentModel(variables) {
                    const [body] = await environmentApi.invoke({
                        body: {
                            query: UPDATE_CONTENT_MODEL,
                            variables
                        }
                    });

                    return getData(body);
                },
                async getContentModel(variables) {
                    const [body] = await environmentApi.invoke({
                        body: {
                            query: GET_CONTENT_MODEL,
                            variables
                        }
                    });

                    return getData(body);
                },
                async deleteContentModel(variables) {
                    const [body] = await environmentApi.invoke({
                        body: {
                            query: DELETE_CONTENT_MODEL,
                            variables
                        }
                    });

                    return getData(body);
                },
                async content(modelId) {
                    const [body] = await environmentApi.invoke({
                        body: {
                            query: GET_CONTENT_MODEL_BY_MODEL_ID,
                            variables: { modelId }
                        }
                    });

                    const { data: contentModel, contentModelError } = body.data.content;

                    if (contentModelError) {
                        throw contentModelError;
                    }

                    const method = queryFactory => async variables => {
                        const [body] = await environmentApi.invoke({
                            body: {
                                query: queryFactory(contentModel),
                                variables
                            }
                        });

                        return getData(body);
                    };

                    return {
                        create: method(createCreateMutation),
                        list: method(createListQuery),
                        delete: method(createDeleteMutation),
                        update: method(createUpdateMutation),
                        publish: method(createPublishMutation),
                        listRevisions: method(createListRevisionsQuery),
                        read: method(createReadQuery),
                        createFrom: method(createCreateFromMutation),
                        unpublish: method(createUnpublishMutation)
                    };
                }
            };

            return environmentApi;
        }
    };
};

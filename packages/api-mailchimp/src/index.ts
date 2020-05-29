import gql from "graphql-tag";
import { emptyResolver, resolveUpdateSettings } from "@webiny/commodo-graphql";
import { ListErrorResponse, ListResponse, ErrorResponse } from "@webiny/graphql";
import { hasScope } from "@webiny/api-security";
import mailchimpSettings from "./mailchimpSettings.model";
import MailchimpApi from "./MailchimpApi";
import { get } from "lodash";
import { Context, ContextPlugin, GraphQLSchemaPlugin } from "@webiny/graphql/types";
import { Context as SettingsManagerContext } from "@webiny/api-settings-manager/types";

type SettingsContext = Context & SettingsManagerContext;

export default () => [
    {
        type: "context",
        name: "context-models-mailchimp",
        apply({ models }) {
            models.MailchimpSettings = mailchimpSettings({ createBase: models.createBase });
        }
    } as ContextPlugin,
    {
        name: "graphql-schema-mailchimp",
        type: "graphql-schema",
        schema: {
            typeDefs: gql`
                type MailchimpSettings {
                    enabled: Boolean
                    apiKey: String
                }

                type MailchimpSettingsResponse {
                    data: MailchimpSettings
                    error: MailchimpError
                }

                input MailchimpSettingsInput {
                    enabled: Boolean
                    apiKey: String
                }

                type MailchimpCursors {
                    next: String
                    previous: String
                }

                type MailchimpListMeta {
                    cursors: MailchimpCursors
                    hasNextPage: Boolean
                    hasPreviousPage: Boolean
                    totalCount: Int
                }

                type MailchimpError {
                    code: String
                    message: String
                    data: JSON
                }

                type MailchimpAddToListResponse {
                    error: MailchimpError
                }

                type MailchimpList {
                    id: String
                    name: String
                }

                type MailchimpListsResponse {
                    data: [MailchimpList]
                    meta: MailchimpListMeta
                    error: MailchimpError
                }

                type MailchimpQuery {
                    listLists: MailchimpListsResponse
                    getSettings: MailchimpSettingsResponse
                }

                type MailchimpMutation {
                    # Add a new member to members list.
                    addToList(list: String!, email: String!): MailchimpAddToListResponse
                    updateSettings(data: MailchimpSettingsInput): MailchimpSettingsResponse
                }

                extend type Query {
                    mailchimp: MailchimpQuery
                }

                extend type Mutation {
                    mailchimp: MailchimpMutation
                }
            `,
            resolvers: {
                Query: {
                    mailchimp: emptyResolver
                },
                Mutation: {
                    mailchimp: emptyResolver
                },
                MailchimpQuery: {
                    listLists: async (
                        _: any,
                        args: { [key: string]: any },
                        context: { [key: string]: any }
                    ) => {
                        const { MailchimpSettings } = context.models;
                        const settings = await MailchimpSettings.load();
                        if (!get(settings, "data.apiKey")) {
                            throw Error("Mailchimp API key not set.");
                        }

                        const mailchimp = new MailchimpApi({ apiKey: settings.data.apiKey });

                        try {
                            const listsResponse = await mailchimp.get({
                                path: `/lists/`
                            });

                            const output = listsResponse.body.lists.map(item => ({
                                id: item.id,
                                name: item.name
                            }));

                            return new ListResponse(output);
                        } catch (e) {
                            return new ListErrorResponse(e);
                        }
                    },
                    getSettings: hasScope("pb:settings")(
                        async (_, args, context: SettingsContext) => {
                            try {
                                const data = await context.settingsManager.getSettings("mailchimp");
                                return { data };
                            } catch (err) {
                                return new ErrorResponse(err);
                            }
                        }
                    )
                },
                MailchimpMutation: {
                    addToList: async (
                        _: any,
                        { list: listId, email }: { [key: string]: any },
                        context: Context
                    ) => {
                        const { MailchimpSettings } = context.models;

                        const settings = await MailchimpSettings.load();
                        if (!get(settings, "data.apiKey")) {
                            throw Error("Mailchimp API key not set.");
                        }

                        const mailchimp = new MailchimpApi({ apiKey: settings.data.apiKey });

                        try {
                            const listResponse = await mailchimp.get({
                                path: `/lists/${listId}`
                            });

                            await mailchimp.post({
                                path: `/lists/${listId}/members`,
                                body: {
                                    // eslint-disable-next-line
                                    email_address: email,
                                    status: listResponse.body.double_optin
                                        ? "pending"
                                        : "subscribed"
                                }
                            });
                        } catch (e) {
                            if (e.body) {
                                return new ErrorResponse({
                                    message: e.body.title,
                                    data: {
                                        code: e.body.status,
                                        detail: e.body.detail,
                                        type: e.body.type
                                    }
                                });
                            }

                            return new ErrorResponse({
                                message: e.message
                            });
                        }
                    },
                    updateSettings: hasScope("pb:settings")(
                        resolveUpdateSettings(({ models }) => models.MailchimpSettings)
                    )
                }
            }
        }
    } as GraphQLSchemaPlugin
];

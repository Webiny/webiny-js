import {
    ErrorResponse,
    ListErrorResponse,
    ListResponse,
    Response
} from "@webiny/handler-graphql/responses";
import { AdminUsersContext, GroupInput } from "~/types";
import { GraphQLSchemaPlugin } from "@webiny/handler-graphql/plugins/GraphQLSchemaPlugin";

export default new GraphQLSchemaPlugin<AdminUsersContext>({
    typeDefs: /* GraphQL */ `
        type SecurityGroup {
            name: String
            slug: String
            createdOn: DateTime
            description: String
            permissions: [JSON]
        }

        input SecurityGroupCreateInput {
            name: String!
            slug: String!
            description: String
            permissions: [JSON!]!
        }

        input SecurityGroupUpdateInput {
            name: String
            description: String
            permissions: [JSON!]
        }

        type SecurityGroupResponse {
            data: SecurityGroup
            error: SecurityError
        }

        type SecurityGroupListResponse {
            data: [SecurityGroup]
            error: SecurityError
        }

        extend type SecurityQuery {
            getGroup(slug: String): SecurityGroupResponse
            listGroups: SecurityGroupListResponse
        }

        extend type SecurityMutation {
            createGroup(data: SecurityGroupCreateInput!): SecurityGroupResponse
            updateGroup(slug: String!, data: SecurityGroupUpdateInput!): SecurityGroupResponse
            deleteGroup(slug: String!): SecurityBooleanResponse
        }
    `,
    resolvers: {
        SecurityQuery: {
            getGroup: async (_, { slug }: { slug: string }, context) => {
                try {
                    const group = await context.security.groups.getGroup(slug);
                    return new Response(group);
                } catch (e) {
                    return new ErrorResponse(e);
                }
            },
            listGroups: async (_, args, context) => {
                try {
                    const groupList = await context.security.groups.listGroups();

                    return new ListResponse(groupList);
                } catch (e) {
                    return new ListErrorResponse(e);
                }
            }
        },
        SecurityMutation: {
            createGroup: async (_, { data }: { data: GroupInput }, context) => {
                try {
                    const group = await context.security.groups.createGroup(data);

                    return new Response(group);
                } catch (e) {
                    return new ErrorResponse(e);
                }
            },
            updateGroup: async (
                _,
                { slug, data }: { slug: string; data: Omit<GroupInput, "slug" | "system"> },
                context
            ) => {
                try {
                    const group = await context.security.groups.updateGroup(slug, data);
                    return new Response(group);
                } catch (e) {
                    return new ErrorResponse(e);
                }
            },
            deleteGroup: async (_, { slug }: { slug: string }, context) => {
                try {
                    await context.security.groups.deleteGroup(slug);

                    return new Response(true);
                } catch (e) {
                    return new ErrorResponse(e);
                }
            }
        }
    }
});

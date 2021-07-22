import { ErrorResponse, Response } from "@webiny/handler-graphql/responses";
import { AdminUsersContext } from "~/types";
import { GraphQLSchemaPlugin } from "@webiny/handler-graphql/plugins/GraphQLSchemaPlugin";

export default new GraphQLSchemaPlugin<AdminUsersContext>({
    typeDefs: /* GraphQL */ `
        input SecurityInstallInput {
            firstName: String!
            lastName: String!
            login: String!
        }

        extend type SecurityQuery {
            "Get installed version"
            version: String
        }

        extend type SecurityMutation {
            "Install Security"
            install(data: SecurityInstallInput!): SecurityBooleanResponse
        }
    `,
    resolvers: {
        SecurityQuery: {
            version: async (root, args, context) => {
                return await context.security.system.getVersion();
            }
        },
        SecurityMutation: {
            install: async (root, args, context) => {
                try {
                    await context.security.system.install(args.data);
                    return new Response(true);
                } catch (e) {
                    return new ErrorResponse(e);
                }
            }
        }
    }
});

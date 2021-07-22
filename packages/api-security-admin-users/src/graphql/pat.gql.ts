import crypto from "crypto";
import { Response, ErrorResponse, NotFoundResponse } from "@webiny/handler-graphql/responses";
import { AdminUsersContext, User } from "~/types";
import { GraphQLSchemaPlugin } from "@webiny/handler-graphql/plugins/GraphQLSchemaPlugin";

const generateToken = (tokenLength = 48) => {
    const token = crypto
        .randomBytes(Math.ceil(tokenLength / 2))
        .toString("hex")
        .slice(0, tokenLength - 1);

    // Personal access tokens are prefixed with a letter "p" to make token verification easier.
    // When authentication plugins kick in, they will be able to tell if they should handle the token by
    // checking the first letter and either process the token or skip authentication completely.
    return `p${token}`;
};

export default new GraphQLSchemaPlugin<AdminUsersContext>({
    typeDefs: /* GraphQL */ `
        type SecurityPersonalAccessToken {
            id: ID
            name: String
            token: String
            createdOn: DateTime
        }
        input SecurityPersonalAccessTokenInput {
            name: String
        }

        type SecurityPersonalAccessTokenCreate {
            pat: SecurityPersonalAccessToken
            # The full token - you only receive it once!
            token: String
        }

        type SecurityPersonalAccessTokenCreateResponse {
            data: SecurityPersonalAccessTokenCreate
            error: SecurityError
        }

        type SecurityPersonalAccessTokenResponse {
            data: SecurityPersonalAccessToken
            error: SecurityError
        }

        extend type SecurityUser {
            personalAccessTokens: [SecurityPersonalAccessToken]
        }

        extend type SecurityMutation {
            createPAT(
                data: SecurityPersonalAccessTokenInput!
            ): SecurityPersonalAccessTokenCreateResponse

            updatePAT(
                id: ID!
                data: SecurityPersonalAccessTokenInput!
            ): SecurityPersonalAccessTokenResponse

            deletePAT(id: ID!): SecurityBooleanResponse
        }
    `,
    resolvers: {
        SecurityUser: {
            personalAccessTokens(user: User, args, context) {
                // A user can only access his own tokens!
                if (user.login !== context.security.getIdentity().id) {
                    return null;
                }

                return context.security.users.listTokens(user.login);
            }
        },
        SecurityPersonalAccessToken: {
            token: pat => {
                return pat.token.substr(-4);
            }
        },
        SecurityMutation: {
            createPAT: async (root, { data }, context) => {
                const identity = context.security.getIdentity();
                if (!identity) {
                    throw new Error("Not authorized!");
                }

                try {
                    const token = generateToken();
                    const tokenData = await context.security.users.createToken(identity, {
                        ...data,
                        token
                    });

                    return new Response({ pat: tokenData, token });
                } catch (e) {
                    return new ErrorResponse({
                        code: e.code,
                        message: e.message,
                        data: e.data || null
                    });
                }
            },
            updatePAT: async (root, { id, data }, context) => {
                const identity = context.security.getIdentity();
                if (!identity) {
                    throw new Error("Not authorized!");
                }

                try {
                    const existingToken = await context.security.users.getPersonalAccessToken(
                        identity.id,
                        id
                    );

                    if (!existingToken) {
                        return new NotFoundResponse(`PAT "${id}" was not found!`);
                    }

                    const updatedData = await context.security.users.updateToken(
                        identity.id,
                        id,
                        data
                    );

                    return new Response(Object.assign({}, existingToken, updatedData));
                } catch (e) {
                    return new ErrorResponse({
                        code: e.code,
                        message: e.message,
                        data: e.data || null
                    });
                }
            },
            deletePAT: async (root, { id }, context) => {
                const identity = context.security.getIdentity();
                if (!identity) {
                    throw new Error("Not authorized!");
                }

                try {
                    const existingToken = await context.security.users.getPersonalAccessToken(
                        identity.id,
                        id
                    );

                    if (!existingToken) {
                        return new NotFoundResponse(`PAT "${id}" was not found!`);
                    }

                    await context.security.users.deleteToken(identity.id, id);

                    return new Response(true);
                } catch (e) {
                    return new ErrorResponse({
                        code: e.code,
                        message: e.message,
                        data: e.data || null
                    });
                }
            }
        }
    }
});

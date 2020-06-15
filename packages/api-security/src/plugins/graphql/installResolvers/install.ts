import { ErrorResponse, Response } from "@webiny/graphql";
import { WithFieldsError } from "@webiny/commodo";
import { InvalidFieldsError } from "@webiny/commodo-graphql";
import { omit } from "lodash";
import * as data from "./data";
import { Context, GraphQLFieldResolver } from "@webiny/graphql/types";
import { SecurityAuthenticationProviderPlugin } from "@webiny/api-security/types";

const ensureFullAccessRole = async context => {
    const { SecurityRole } = context.models;
    let role = await SecurityRole.findOne({ query: { slug: "full-access" } });
    if (!role) {
        role = new SecurityRole();
        await role.populate(data.fullAccessRole).save();
    }
    return role;
};

const ensureFullAccessGroup = async context => {
    const { SecurityGroup } = context.models;
    let group = await SecurityGroup.findOne({ query: { slug: "security-full-access" } });
    if (!group) {
        group = new SecurityGroup();
        await group.populate({ ...data.securityFullAccessGroup, roles: data.roles }).save();
    }
};

/**
 * We consider security to be installed if there are users in both Webiny DB
 * and 3rd party authentication provider.
 */
const isSecurityInstalled = async (context: Context) => {
    const { SecurityUser } = context.models;

    // Check if at least 1 user exists in the system
    const userCount = await SecurityUser.count();

    if (userCount > 0) {
        // Make sure the authentication provider also has at least 1 user
        const authPlugin = context.plugins
            .byType<SecurityAuthenticationProviderPlugin>("security-authentication-provider")
            // eslint-disable-next-line no-prototype-builtins
            .filter(pl => pl.hasOwnProperty("countUsers"))
            .pop();

        const remoteUserCount = await authPlugin.countUsers();
        if (remoteUserCount > 0) {
            return true;
        }
    }

    return false;
};

export const install: GraphQLFieldResolver = async (root, args, context) => {
    const { SecurityUser } = context.models;
    const { data } = args;

    if (await isSecurityInstalled(context)) {
        return new ErrorResponse({
            code: "SECURITY_INSTALL_ABORTED",
            message: "Security is already installed."
        });
    }

    /**
     * At this point we know there is a user missing either in Webiny DB, or in the 3rd party auth provider, or both.
     */
    const result = { user: false, authUser: false };

    try {
        const authPlugin = context.plugins
            .byType<SecurityAuthenticationProviderPlugin>("security-authentication-provider")
            .filter(pl => pl.hasOwnProperty("createUser"))
            .pop();

        const fullAccessRole = await ensureFullAccessRole(context);
        await ensureFullAccessGroup(context);

        // Try loading the user
        let user = await SecurityUser.findOne({ query: { email: args.data.email } });
        if (!user) {
            // Create new user
            user = new SecurityUser();
            await user.populate({ ...data, roles: [fullAccessRole] });
            result.user = true;
        } else {
            // Update user's data
            user.firstName = data.firstName;
            user.lastName = data.lastName;
        }

        const authUser = await authPlugin.getUser({ email: args.data.email });
        if (!authUser) {
            await authPlugin.createUser({ data: args.data, user, permanent: true }, context);
        } else {
            // Update firstName/lastName, but do not touch the existing password
            await authPlugin.updateUser({ data: omit(args.data, ["password"]), user }, context);
        }
        await user.save();
        result.authUser = true;
    } catch (e) {
        if (e.code === WithFieldsError.VALIDATION_FAILED_INVALID_FIELDS) {
            const attrError = InvalidFieldsError.from(e);
            return new ErrorResponse({
                code: attrError.code || WithFieldsError.VALIDATION_FAILED_INVALID_FIELDS,
                message: attrError.message,
                data: attrError.data
            });
        }
        return new ErrorResponse({
            code: e.code,
            message: e.message,
            data: e.data
        });
    }

    return new Response(result);
};

export const isInstalled: GraphQLFieldResolver = async (root, args, context) => {
    return new Response(await isSecurityInstalled(context));
};

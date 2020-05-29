import { ContextPlugin } from "@webiny/graphql/types";
import models from "./models";
import modelFields from "./modelFields";
import filterOperators from "./filterOperators";
import graphqlFields from "./graphqlFields";
import graphql from "./graphql";
import { TypeValueEmitter } from "./utils/TypeValueEmitter";

type HeadlessPluginsOptions = {
    type: string;
    environment: string;
    dataManagerFunction?: string;
};

export default (
    options: HeadlessPluginsOptions = {
        type: null,
        environment: null,
        dataManagerFunction: null
    }
) => [
    {
        name: "context-cms-context",
        type: "context",
        apply(context) {
            context.cms = context.cms || {};
            context.cms.type = options.type || "read";
            context.cms.environment = options.environment;
            context.cms.dataManagerFunction = options.dataManagerFunction;

            context.cms.READ = options.type === "read";
            context.cms.PREVIEW = options.type === "preview";
            context.cms.MANAGE = options.type === "manage";

            if (!context.cms.MANAGE) {
                context.resolvedValues = new TypeValueEmitter();
            }
        }
    } as ContextPlugin,
    models(),
    {
        name: "context-cms-validate-access-token",
        type: "context",
        async apply(context) {
            if (context.event && (context.cms.READ || context.cms.PREVIEW)) {
                // TODO refactor this: move context.event inside
                const accessToken = context.event.headers["access-token"];
                const { CmsAccessToken } = context.models;

                const token = await CmsAccessToken.findOne({
                    query: { token: accessToken }
                });

                if (!token) {
                    throw new Error("Access token is invalid!");
                }

                const allowedEnvironments = await token.environments;
                const currentEnvironment = context.cms.getEnvironment();
                if (!allowedEnvironments.find(env => env.id === currentEnvironment.id)) {
                    throw new Error(
                        `Your Token cannot access environment ${currentEnvironment.name}`
                    );
                }
            }
        }
    },
    graphql(options),
    modelFields,
    graphqlFields,
    filterOperators()
];

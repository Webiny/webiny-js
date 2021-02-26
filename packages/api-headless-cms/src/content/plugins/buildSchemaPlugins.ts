import { GraphQLSchemaPlugin } from "@webiny/handler-graphql/types";
import { CmsContext } from "../../types";
import contentModels from "./schema/contentModels";
import contentModelGroups from "./schema/contentModelGroups";
import baseSchema from "./schema/baseSchema";
import { generateSchemaPlugins } from "./schema/schemaPlugins";

/**
 * This factory is called whenever we need to generate graphql-schema plugins using the current context.
 */
export default async (context: CmsContext): Promise<GraphQLSchemaPlugin<CmsContext>[]> => {
    return [
        // Base GQL types and scalars
        baseSchema(context),
        contentModels(context),
        contentModelGroups(context),
        // Dynamic schema
        ...(await generateSchemaPlugins(context))
    ];
};

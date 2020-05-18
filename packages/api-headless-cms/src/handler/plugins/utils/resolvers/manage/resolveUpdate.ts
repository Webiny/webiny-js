import { GraphQLFieldResolver } from "@webiny/graphql/types";
import { Response, ErrorResponse } from "@webiny/commodo-graphql";
import { CmsContext } from "@webiny/api-headless-cms/types";
import { entryNotFound } from "./../entryNotFound";
import { setContextLocale } from "./../../setContextLocale";

export const resolveUpdate = ({ model }): GraphQLFieldResolver<any, any, CmsContext> => async (
    root,
    args,
    context
) => {
    setContextLocale(context, args.locale);

    const Model = context.models[model.modelId];
    const instance = await Model.findOne({ query: args.where });
    if (!instance) {
        return entryNotFound(JSON.stringify(args.where));
    }

    try {
        instance.populate(args.data);
        await instance.save();
        return new Response(instance);
    } catch (e) {
        return new ErrorResponse({
            code: e.code,
            message: e.message,
            data: e.data || null
        });
    }
};

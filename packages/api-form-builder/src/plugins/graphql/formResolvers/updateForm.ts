import { ErrorResponse, NotFoundResponse, Response } from "@webiny/handler-graphql/responses";
import { GraphQLFieldResolver } from "@webiny/handler-graphql/types";
import { NotAuthorizedResponse } from "@webiny/api-security";
import { FormsCRUD } from "../../../types";
import { hasRwd } from "./utils/formResolversUtils";

const resolver: GraphQLFieldResolver = async (root, args, context) => {
    const forms: FormsCRUD = context?.formBuilder?.crud?.forms;
    const { id, data } = args;

    // If permission has "rwd" property set, but "w" is not part of it, bail.
    const formBuilderFormPermission = await context.security.getPermission("fb.form");
    if (formBuilderFormPermission && !hasRwd({ formBuilderFormPermission, rwd: "w" })) {
        return new NotAuthorizedResponse();
    }

    try {
        const existingForm = await forms.getForm(id);

        if (!existingForm) {
            return new NotFoundResponse(`Form with id:"${id}" not found!`);
        }

        await forms.updateForm(id, data);
        const form = await forms.getForm(id);

        return new Response(form);
    } catch (e) {
        return new ErrorResponse({
            code: e.code,
            message: e.message,
            data: e.data
        });
    }
};

export default resolver;

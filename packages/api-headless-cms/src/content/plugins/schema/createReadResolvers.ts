import { CmsContentModel, CmsFieldTypePlugins, CmsContext } from "~/types";
import { createTypeName } from "../utils/createTypeName";
import { resolveGet } from "./resolvers/read/resolveGet";
import { resolveList } from "./resolvers/read/resolveList";
import { pluralizedTypeName } from "../utils/pluralizedTypeName";
import { createFieldResolversFactory } from "~/content/plugins/schema/createFieldResolvers";

interface CreateReadResolvers {
    (params: {
        models: CmsContentModel[];
        model: CmsContentModel;
        context: CmsContext;
        fieldTypePlugins: CmsFieldTypePlugins;
    }): any;
}

export const createReadResolvers: CreateReadResolvers = ({ models, model, fieldTypePlugins }) => {
    const typeName = createTypeName(model.modelId);

    const createFieldResolvers = createFieldResolversFactory({
        endpointType: "read",
        models,
        model,
        fieldTypePlugins
    });

    return {
        Query: {
            [`get${typeName}`]: resolveGet({ model }),
            [`list${pluralizedTypeName(typeName)}`]: resolveList({ model })
        },
        ...createFieldResolvers({
            fields: model.fields
        })
    };
};

import { CmsFieldTypePlugins, CmsContentModel } from "@webiny/api-headless-cms/types";

interface RenderListFilterFields {
    (params: {
        model: CmsContentModel;
        type: string;
        fieldTypePlugins: CmsFieldTypePlugins;
    }): string;
}

export const renderListFilterFields: RenderListFilterFields = ({
    model,
    type,
    fieldTypePlugins
}) => {
    return model.fields
        .map(field => {
            const { createListFilters } = fieldTypePlugins[field.type][type];
            if (typeof createListFilters === "function") {
                return createListFilters({ model, field });
            }
        })
        .filter(Boolean)
        .join("\n");
};

import { CmsModelFieldToCommodoFieldPlugin } from "@webiny/api-headless-cms/types";
import { withFields, string } from "@webiny/commodo";
import { i18nField } from "./i18nFields";

const plugin: CmsModelFieldToCommodoFieldPlugin = {
    name: "cms-model-field-to-commodo-field-long-text",
    type: "cms-model-field-to-commodo-field",
    fieldType: "long-text",
    isSortable: false,
    dataModel({ model, field, validation, context }) {
        withFields({
            [field.fieldId]: i18nField({ field: string({ validation }), context })
        })(model);
    },
    searchModel({ model, field, validation }) {
        withFields({
            [field.fieldId]: string({ validation })
        })(model);
    }
};

export default plugin;

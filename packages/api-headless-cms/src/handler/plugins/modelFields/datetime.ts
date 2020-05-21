import { CmsModelFieldToCommodoFieldPlugin } from "@webiny/api-headless-cms/types";
import { withFields, string } from "@webiny/commodo";
import { parse } from "fecha";
import { i18nField } from "./i18nFields";

enum DATE_TYPE {
    DATE_TIME_WITH_TIMEZONE = "dateTimeWithTimezone",
    DATE_TIME_WITHOUT_TIMEZONE = "dateTimeWithoutTimezone",
    DATE = "date",
    TIME = "time"
}

function createValidation(validation, format, checkLength = true) {
    return async value => {
        if (validation === false) {
            return;
        }

        const error = Error(`Enter a string in the following format "${format}"`);
        if (checkLength && format.length !== value.length) {
            throw error;
        }

        const date = parse(value, format);
        if (!date) {
            throw error;
        }

        if (typeof validation === "function") {
            await validation(value);
        }
    };
}

function getDateField({ field, validation }) {
    const type: DATE_TYPE = field.settings.type;
    let cField;
    switch (type) {
        case DATE_TYPE.DATE_TIME_WITH_TIMEZONE:
            cField = string({
                validation: createValidation(validation, "YYYY-MM-DDTHH:mm:ssZ", false)
            });
            break;
        case DATE_TYPE.DATE_TIME_WITHOUT_TIMEZONE:
            cField = string({
                validation: createValidation(validation, "YYYY-MM-DD HH:mm:ss")
            });
            break;
        case DATE_TYPE.DATE:
            cField = string({ validation: createValidation(validation, "YYYY-MM-DD") });
            break;
        case DATE_TYPE.TIME:
            cField = string({ validation: createValidation(validation, "HH:mm:ss") });
            break;
    }

    return cField;
}

const plugin: CmsModelFieldToCommodoFieldPlugin = {
    name: "cms-model-field-to-commodo-field-datetime",
    type: "cms-model-field-to-commodo-field",
    fieldType: "datetime",
    dataModel({ model, field, validation, context }) {
        withFields({
            [field.fieldId]: i18nField({
                field: getDateField({ field, validation }),
                context
            })
        })(model);
    },
    searchModel({ model, field }) {
        withFields({
            [field.fieldId]: getDateField({ field, validation: false })
        })(model);
    }
};

export default plugin;

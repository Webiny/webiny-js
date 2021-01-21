import { validation } from "@webiny/validation";
import { CmsModelFieldValidatorPlugin } from "@webiny/app-headless-cms/types";

export default (): CmsModelFieldValidatorPlugin => ({
    type: "cms-model-field-validator",
    name: "cms-model-field-validator-date-gte",
    validator: {
        name: "dateGte",
        validate: (value, validator) => {
            const { value: gteValue, type } = validator.settings;
            if (typeof gteValue === "undefined") {
                return;
            } else if (type === "time") {
                return validation.validate(value, `timeGte:${gteValue}`);
            }
            return validation.validate(value, `dateGte:${gteValue}`);
        }
    }
});

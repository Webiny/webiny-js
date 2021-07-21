import { CmsFieldFilterPathPlugin } from "~/types";
import WebinyError from "@webiny/error";

export default (): CmsFieldFilterPathPlugin => ({
    type: "cms-field-filter-path",
    name: "cms-field-filter-path-plain-object",
    fieldType: "plainObject",
    createPath: ({ field }) => {
        const { path } = field.settings || {};
        if (!path) {
            throw new WebinyError("Missing path settings value.", "FIELD_SETTINGS_ERROR", {
                field
            });
        }
        return path;
    }
});

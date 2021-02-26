import React from "react";
import { ReactComponent as BooleanIcon } from "./icons/toggle_on-black-24px.svg";
import { CmsEditorFieldTypePlugin } from "../../../types";
import { i18n } from "@webiny/app/i18n";

const t = i18n.ns("app-headless-cms/admin/fields");

const plugin: CmsEditorFieldTypePlugin = {
    type: "cms-editor-field-type",
    name: "cms-editor-field-type-boolean",
    field: {
        type: "boolean",
        label: t`Boolean`,
        description: t`Store boolean ("yes" or "no" ) values.`,
        icon: <BooleanIcon />,
        allowMultipleValues: false,
        allowPredefinedValues: false,
        multipleValuesLabel: t`Use as a list of booleans`,
        createField() {
            return {
                type: this.type,
                validation: [],
                renderer: {
                    name: ""
                }
            };
        }
    }
};

export default plugin;

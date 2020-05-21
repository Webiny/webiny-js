import React from "react";
import { CmsEditorFieldRendererPlugin } from "@webiny/app-headless-cms/types";
import { I18NValue } from "@webiny/app-i18n/components";
import { Input } from "@webiny/ui/Input";

import { i18n } from "@webiny/app/i18n";
const t = i18n.ns("app-headless-cms/admin/fields/text");

const plugin: CmsEditorFieldRendererPlugin = {
    type: "cms-editor-field-renderer",
    name: "cms-editor-field-renderer-long-text-textarea",
    renderer: {
        rendererName: "long-text-text-area",
        name: t`Text Area`,
        description: t`Renders a simple text area, suitable for larger amounts of text.`,
        canUse({ field }) {
            return field.type === "long-text" && !field.multipleValues && !field.predefinedValues;
        },
        render({ field, getBind }) {
            const Bind = getBind();
            return (
                <Bind>
                    {bind => (
                        <Input
                            {...bind}
                            rows={5}
                            label={I18NValue({ value: field.label })}
                            placeholder={I18NValue({ value: field.placeholderText })}
                            description={I18NValue({ value: field.helpText })}
                        />
                    )}
                </Bind>
            );
        }
    }
};

export default plugin;

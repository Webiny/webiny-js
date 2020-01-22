import textFieldPlugin from "./../text";
import { FbBuilderFieldPlugin } from "@webiny/app-form-builder/types";

const plugin: FbBuilderFieldPlugin = {
    type: "form-editor-field-type",
    name: "form-editor-field-type-post-code",
    field: {
        ...textFieldPlugin.field,
        unique: true,
        group: "form-editor-field-group-contact",
        name: "postCode",
        label: "Post code",
        createField(props) {
            const { i18n } = props;
            return {
                ...textFieldPlugin.field.createField(props),
                name: this.name,
                fieldId: "postCode",
                label: {
                    values: [
                        {
                            locale: i18n.getDefaultLocale().id,
                            value: "Post code"
                        }
                    ]
                }
            };
        }
    }
};

export default plugin;

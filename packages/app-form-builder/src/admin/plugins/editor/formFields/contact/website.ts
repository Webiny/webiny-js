import textFieldPlugin from "./../text";
import { FbBuilderFieldPlugin } from "../../../../../types";

const plugin: FbBuilderFieldPlugin = {
    type: "form-editor-field-type",
    name: "form-editor-field-type-website",
    field: {
        ...textFieldPlugin.field,
        unique: true,
        group: "form-editor-field-group-contact",
        name: "website",
        label: "Website",
        description: "Link to a website",
        createField(props) {
            return {
                ...textFieldPlugin.field.createField(props),
                name: this.name,
                fieldId: "website",
                label: "Website",
                validation: [
                    {
                        name: "pattern",
                        message: "Please enter a valid URL.",
                        settings: {
                            preset: "url",
                            regex: null,
                            flags: null
                        }
                    }
                ]
            };
        }
    }
};

export default plugin;

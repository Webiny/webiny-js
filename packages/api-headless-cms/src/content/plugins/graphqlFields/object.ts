import upperFirst from "lodash/upperFirst";
import { CmsContentModelField, CmsModelFieldToGraphQLPlugin } from "~/types";
import { renderField } from "~/content/plugins/utils/renderFields";
import { renderInputField } from "~/content/plugins/utils/renderInputFields";
import { createManageTypeName, createTypeName } from "~/content/plugins/utils/createTypeName";

const typeFromField = ({ typeOfType, model, type, field, fieldTypePlugins }) => {
    const typeSuffix = typeOfType === "input" ? "Input" : "";
    const typeName = createTypeName(model.modelId);
    const mTypeName = createManageTypeName(typeName);

    // `field` is an "object" field
    const fields = field.settings.fields as CmsContentModelField[];
    const fieldTypeName = `${mTypeName}_${upperFirst(field.fieldId)}`;

    const typeFields = [];
    const nestedTypes = [];

    // Once the loop below starts, we'll be executing a recursive "object" type generation.
    // The main trick here is that nested objects don't know who the parent is, and will generate
    // type names using the "model", as if they're at the top level:
    // Every time the types are returned, we need to replace the model name in the generated type name
    // with the actual prefix which includes parent field name type.
    const replace = new RegExp(`${mTypeName}_`, "g");

    const renderer = typeOfType === "type" ? renderField : renderInputField;

    for (const f of fields) {
        const { fields, typeDefs } = renderer({ field: f, type, model, fieldTypePlugins });
        typeFields.push(fields.replace(replace, `${fieldTypeName}_`));
        if (typeDefs) {
            nestedTypes.push(typeDefs.replace(replace, `${fieldTypeName}_`));
        }
    }

    return {
        fieldType: `${fieldTypeName}${typeSuffix}`,
        typeDefs: /* GraphQL */ `
            ${nestedTypes.join("\n")}
                    
            ${typeOfType} ${fieldTypeName}${typeSuffix} {
                ${typeFields.join("\n")}
            }
        `
    };
};

const plugin: CmsModelFieldToGraphQLPlugin = {
    name: "cms-model-field-to-graphql-object",
    type: "cms-model-field-to-graphql",
    fieldType: "object",
    isSortable: false,
    isSearchable: false,
    read: {
        createTypeField({ field }) {
            if (field.multipleValues) {
                return `${field.fieldId}: [JSON]`;
            }

            return `${field.fieldId}: JSON`;
        }
    },
    manage: {
        createTypeField({ model, field, fieldTypePlugins }) {
            const { fieldType, typeDefs } = typeFromField({
                typeOfType: "type",
                model,
                type: "manage",
                field,
                fieldTypePlugins
            });

            return {
                fields: `${field.fieldId}: ${field.multipleValues ? `[${fieldType}]` : fieldType}`,
                typeDefs
            };
        },
        createInputField({ model, field, fieldTypePlugins }) {
            const { fieldType, typeDefs } = typeFromField({
                typeOfType: "input",
                model,
                type: "manage",
                field,
                fieldTypePlugins
            });

            return {
                fields: `${field.fieldId}: ${field.multipleValues ? `[${fieldType}]` : fieldType}`,
                typeDefs
            };
        }
    }
};

export default plugin;

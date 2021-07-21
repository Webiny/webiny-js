import { CmsContentModelField, CmsModelFieldToGraphQLPlugin } from "../../../types";

const fieldGraphQLTypes = {
    time: "Time",
    dateTimeWithoutTimezone: "DateTime",
    dateTimeWithTimezone: "DateTimeZ",
    date: "Date"
};

const getFieldGraphQLType = (field: CmsContentModelField): string => {
    const { type } = field.settings || {};
    if (!type || !fieldGraphQLTypes[type]) {
        return "DateTime";
    }
    return fieldGraphQLTypes[type];
};

const createListFilters = ({ field }) => {
    return `
        ${field.fieldId}: ${getFieldGraphQLType(field)}
        ${field.fieldId}_not: ${getFieldGraphQLType(field)}
        ${field.fieldId}_in: [${getFieldGraphQLType(field)}]
        ${field.fieldId}_not_in: [${getFieldGraphQLType(field)}]
        ${field.fieldId}_lt: ${getFieldGraphQLType(field)}
        ${field.fieldId}_lte: ${getFieldGraphQLType(field)}
        ${field.fieldId}_gt: ${getFieldGraphQLType(field)}
        ${field.fieldId}_gte: ${getFieldGraphQLType(field)}
    `;
};

const plugin: CmsModelFieldToGraphQLPlugin = {
    name: "cms-model-field-to-graphql-datetime",
    type: "cms-model-field-to-graphql",
    fieldType: "datetime",
    isSortable: true,
    isSearchable: true,
    read: {
        createListFilters,
        createGetFilters({ field }) {
            return `${field.fieldId}: ${getFieldGraphQLType(field)}`;
        },
        createTypeField({ field }) {
            if (field.multipleValues) {
                return `${field.fieldId}: [${getFieldGraphQLType(field)}]`;
            }

            return `${field.fieldId}: ${getFieldGraphQLType(field)}`;
        }
    },
    manage: {
        createListFilters,
        createTypeField({ field }) {
            return `${field.fieldId}: ${getFieldGraphQLType(field)}`;
        },
        createInputField({ field }) {
            return `${field.fieldId}: ${getFieldGraphQLType(field)}`;
        }
    }
};

export default plugin;

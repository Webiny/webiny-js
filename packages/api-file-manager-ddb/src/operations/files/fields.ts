import { FieldPathPlugin } from "@webiny/db-dynamodb/plugins/FieldPathPlugin";
import { DateTimeTransformPlugin } from "@webiny/db-dynamodb/plugins/transformers/DateTimeTransformPlugin";
import { NumberTransformPlugin } from "@webiny/db-dynamodb/plugins/transformers/NumberTransformPlugin";

export default () => [
    /**
     * Path plugin for the fields that are ddb map type and the value filtered by is the id property in the object.
     */
    new FieldPathPlugin({
        fields: ["createdBy"],
        createPath: (field: string): string => {
            return `${field}.id`;
        }
    }),
    /**
     * Path plugin for meta field properties.
     */
    new FieldPathPlugin({
        fields: ["private"],
        createPath: (field: string) => {
            return `meta.${field}`;
        }
    }),
    /**
     * Value transformation for the dateTime fields.
     */
    new DateTimeTransformPlugin({
        fields: ["createdOn"]
    }),
    /**
     * Value transformation for the number fields.
     */
    new NumberTransformPlugin({
        fields: ["size"]
    })
];

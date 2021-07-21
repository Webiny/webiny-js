import { CmsContentModelField } from "@webiny/api-headless-cms/types";

const createSystemField = (field: Partial<CmsContentModelField>): CmsContentModelField => {
    return field as CmsContentModelField;
};

export const systemFields: Record<string, CmsContentModelField> = {
    id: createSystemField({
        id: "id",
        type: "text",
        fieldId: "id"
    }),
    entryId: createSystemField({
        id: "entryId",
        type: "text",
        fieldId: "entryId"
    }),
    createdOn: createSystemField({
        id: "createdOn",
        type: "datetime",
        fieldId: "createdOn",
        settings: {
            type: "datetime"
        }
    }),
    savedOn: createSystemField({
        id: "savedOn",
        type: "datetime",
        fieldId: "savedOn",
        settings: {
            type: "datetime"
        }
    }),
    createdBy: createSystemField({
        id: "createdBy",
        type: "plainObject",
        fieldId: "createdBy",
        settings: {
            path: "createdBy.id"
        }
    }),
    ownedBy: createSystemField({
        id: "ownedBy",
        type: "plainObject",
        fieldId: "ownedBy",
        settings: {
            path: "ownedBy.id"
        }
    })
};

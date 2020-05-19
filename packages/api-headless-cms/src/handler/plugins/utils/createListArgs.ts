import { CmsContentModel, CmsContentModelField } from "@webiny/api-headless-cms/types";
import { createReadTypeName, createTypeName } from "../utils/createTypeName";

interface CreateListArgs {
    (params: { model: CmsContentModel; field: CmsContentModelField }): string;
}

export const createListArgs: CreateListArgs = ({ field }) => {
    const localeArg = "locale: String";
    const typeName = createTypeName(field.settings.modelId);
    const rTypeName = createReadTypeName(typeName);

    return /* GraphQL */ `(
        ${localeArg}
        where: ${rTypeName}ListWhereInput
        sort: [${rTypeName}ListSorter]
        limit: Int
        after: String
        before: String
    )`;
};

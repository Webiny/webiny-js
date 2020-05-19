import { GraphQLSchemaModule } from "apollo-graphql";
import { Context as APIContext, GraphQLFieldResolver, Plugin } from "@webiny/graphql/types";
import { Context as I18NContext, I18NLocale } from "@webiny/api-i18n/types";
import { Context as CommodoContext } from "@webiny/api-plugin-commodo-db-proxy/types";

export interface CmsDataManager {
    generateRevisionIndexes({ revision }): Promise<void>;
    generateContentModelIndexes({ contentModel }): Promise<void>;
    deleteEnvironment({ environment }): Promise<void>;
    copyEnvironment({ copyFrom, copyTo }): Promise<void>;
}

export type CmsLocalizedModelFieldValue<T> = {
    locale: string;
    value: T;
};

export type CmsEnvironment = {
    id: string;
    name: string;
    description: string;
    changedOn: Date;
    save(): Promise<boolean>;
};

export type CmsEnvironmentAlias = {
    id: string;
    name: string;
    slug: string;
    description: string;
};

export type Context = {
    cms: {
        // API type
        type: string;
        // Requested environment
        environment: string;
        // Returns an instance of current environment.
        getEnvironment: () => CmsEnvironment;
        // Returns an instance of current environment alias.
        getEnvironmentAlias: () => CmsEnvironmentAlias;
        // Requested locale
        locale: I18NLocale;
        // This is a READ API
        READ: boolean;
        // This is a MANAGE API
        MANAGE: boolean;
        // This is a PREVIEW API
        PREVIEW: boolean;
        // Data manager instance
        dataManager: CmsDataManager;
    };
};

/**
 * This combines all contexts used in the CMS into a single type.
 */
export type CmsContext = APIContext & I18NContext & CommodoContext & Context;

export type CmsModelFieldValue<T> = {
    values: CmsLocalizedModelFieldValue<T>[];
};

export type CmsFieldValidation = {
    name: string;
    message: CmsModelFieldValue<string>;
    settings: { [key: string]: any };
};

export type CmsContentModelField = {
    _id: string;
    label: CmsModelFieldValue<string>;
    type: string;
    fieldId: string;
    unique: boolean;
    validation: CmsFieldValidation[];
    settings?: { [key: string]: any };
};

export type CmsModelFieldValidatorPlugin = Plugin & {
    type: "cms-model-field-validator";
    validator: {
        name: string;
        validate(params: {
            value: any;
            validator: CmsFieldValidation;
            context: CmsContext;
        }): Promise<boolean>;
    };
};

export type CmsModelFieldPatternValidatorPlugin = Plugin & {
    type: "cms-model-field-validator-pattern";
    pattern: {
        name: string;
        regex: string;
        flags: string;
    };
};

export type CmsContentModelIndex = {
    fields: string[];
};

export type CmsContentModel = {
    environment: string;
    title: string;
    description: string;
    modelId: string;
    usedFields: string[];
    titleFieldId: string;
    indexes: CmsContentModelIndex[];
    fields: CmsContentModelField[];
    getUniqueIndexFields(): string[];
    save(): Promise<boolean>;
};

export type CmsModelFieldToCommodoFieldPlugin<TContext = CmsContext> = Plugin & {
    type: "cms-model-field-to-commodo-field";
    fieldType: string;
    isSortable: boolean;
    dataModel(params: {
        context: TContext;
        model: Function;
        field: CmsContentModelField;
        validation(value): Promise<boolean>;
    }): void;
    searchModel?(params: {
        context: TContext;
        model: Function;
        field: CmsContentModelField;
        validation?(value): Promise<boolean>;
    }): void;
};

export type CmsModelFieldToGraphQLPlugin = Plugin & {
    type: "cms-model-field-to-graphql";
    isSortable: boolean;
    fieldType: string;
    read: {
        createGetFilters?(params: { model: CmsContentModel; field: CmsContentModelField }): string;
        createListFilters?(params: { model: CmsContentModel; field: CmsContentModelField }): string;
        createTypeField(params: { model: CmsContentModel; field: CmsContentModelField }): string;
        createResolver(params: {
            models: CmsContentModel[];
            model: CmsContentModel;
            field: CmsContentModelField;
        }): GraphQLFieldResolver;
    };
    manage: {
        createListFilters?(params: { model: CmsContentModel; field: CmsContentModelField }): string;
        createSchema?(params: {
            models: CmsContentModel[];
            model: CmsContentModel;
        }): GraphQLSchemaModule;
        createTypeField(params: { model: CmsContentModel; field: CmsContentModelField }): string;
        createInputField(params: { model: CmsContentModel; field: CmsContentModelField }): string;
        createResolver(params: {
            models: CmsContentModel[];
            model: CmsContentModel;
            field: CmsContentModelField;
        }): GraphQLFieldResolver;
    };
};

export type CmsFieldTypePlugins = {
    [key: string]: CmsModelFieldToGraphQLPlugin;
};

export type CmsFindFilterOperator = Plugin & {
    type: "cms-find-filter-operator";
    operator: string;
    createCondition(params: {
        fieldId: string;
        field: CmsContentModelField;
        value: any;
        context: CmsContext;
    }): { [key: string]: any };
};

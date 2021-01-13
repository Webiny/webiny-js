import * as React from "react";
import { Plugin } from "@webiny/plugins/types";
import { ReactElement, ReactNode } from "react";
import { BindComponent, FormChildrenFunctionParams, Form } from "@webiny/form";
import { ApolloClient } from "apollo-client";
import { IconPrefix, IconName } from "@fortawesome/fontawesome-svg-core";
import Label from "./admin/views/components/ContentModelForm/ContentFormRender/components/Label";

export interface CmsEditorFieldTypePlugin extends Plugin {
    /**
     * a plugin type
     */
    type: "cms-editor-field-type";
    field: {
        /**
         * A unique identifier of the field type (text, number, json, myField, ...).
         *
         * ```ts
         * type: "myField"
         * ```
         */
        type: string;
        /**
         * A display name for the field.
         *
         * ```ts
         * label: "Field name"
         * ```
         */
        label: string;
        /**
         * A list of available validators for the model field.
         *
         * ```ts
         * validators: [
         *     "required",
         *     "gte",
         *     "lte"
         * ]
         * ```
         */
        validators?: string[];
        /**
         * An explanation of the field displayed beneath the label.
         *
         * ```ts
         * description: "A short description of the field"
         * ```
         */
        description: string;
        /**
         * A ReactNode to display the icon for the field.
         *
         * ```tsx
         * icon: <MyIconComponent />
         * ```
         */
        icon: React.ReactNode;
        /**
         * Is it allowed to have multiple values in this field?
         *
         * ```ts
         * allowMultipleValues: true
         * ```
         */
        allowMultipleValues: boolean;
        /**
         * Does this field type have a fixed list of values that can be selected?
         *
         * ```ts
         * allowPredefinedValues: false
         * ```
         */
        allowPredefinedValues: boolean;
        /**
         * A ReactNode label when multiple values are enabled.
         */
        multipleValuesLabel: React.ReactNode;
        /**
         * These are default values when the field is first created. This is a representation of the field that is stored in the database.
         *
         * ```ts
         * createField: () => ({
         *     type: "fieldType",
         *     validation: [],
         *     renderer: {
         *         name: "fieldTypeRenderer"
         *     }
         * })
         * ```
         */
        createField: () => CmsEditorField;
        /**
         * A ReactNode that you can add in the section below the help text when creating/editing field.
         *
         * ```tsx
         * renderSettings: (params) => {
         *     return <FieldSettingsComponent />;
         * }
         * ```
         */
        renderSettings?: (params: {
            form: FormChildrenFunctionParams;
            afterChangeLabel: (value: string) => void;
            uniqueFieldIdValidator: (fieldId: string) => void;
            contentModel: CmsEditorContentModel;
        }) => React.ReactNode;
        /**
         * A ReactNode that renders in the Predefined values tab.
         *
         * ```tsx
         * renderPredefinedValues: (params) => {
         *     const {form: {Bind}} = params;
         *     return (
         *         <Bind name="fieldProperty">
         *             <InputComponent />
         *         </Bind>
         *     );
         * }
         * ```
         */
        renderPredefinedValues?: (params: {
            form: FormChildrenFunctionParams;
            getBind: (index?: number) => any;
        }) => React.ReactNode;
        /**
         * Object wrapper for GraphQL stuff
         */
        graphql?: {
            /**
             * Define how does the GraphQL field type look like.
             *
             * ```ts
             * graphql: {
             *     queryField: `
             *         myField {
             *             id
             *             title
             *             createdOn
             *         }
             *     `,
             * }
             * ```
             */
            queryField?: string;
        };
    };
}

export interface CmsEditorFieldRendererPlugin extends Plugin {
    /**
     * a plugin type
     */
    type: "cms-editor-field-renderer";
    renderer: {
        /**
         * Name of the renderer to match the one from `createField()` method in `CmsEditorFieldTypePlugin`.
         *
         * ```ts
         * renderName: "myFieldTypeRenderer"
         * ```
         */
        rendererName: string;
        /**
         * A display name for the field in the UI. It is a `ReactNode` type so you can return a component if you want to.
         *
         * ```tsx
         * name: <MyFieldNameComponent />
         * ```
         */
        name: React.ReactNode;
        /**
         * A description for the field in the UI. Works exactly like the `name` property.
         *
         * ```tsx
         * name: <MyFieldDescriptionComponent />
         * ```
         */
        description: React.ReactNode;
        /**
         * A method that determines if the field can be rendered by this plugin.
         *
         * ```ts
         * canUse({ field }) {
         *     return (
         *         field.type === "myType" && !field.multipleValues
         *     );
         * }
         * ```
         */
        canUse(props: { field: CmsEditorField }): boolean;
        /**
         * Renders a field in the UI.
         *
         * ```tsx
         * render({ field, getBind }) {
         *     const Bind = getBind();
         *
         *     return (
         *         <Bind>
         *             {bind => {
         *                 return (
         *                     <Input
         *                         value={bind.value}
         *                         onChange={bind.onChange}
         *                     />
         *                 )
         *             }}
         *         </Bind>
         *     );
         * }
         * ```
         */
        render(props: {
            field: CmsEditorField;
            Label: typeof Label;
            getBind: (index?: number) => any;
            contentModel: CmsEditorContentModel;
        }): React.ReactNode;
    };
}

export type CmsEditorField<T = unknown> = T & {
    id?: string;
    type: string;
    fieldId?: CmsEditorFieldId;
    label?: string;
    helpText?: string;
    placeholderText?: string;
    validation?: CmsEditorFieldValidator[];
    multipleValuesValidation?: CmsEditorFieldValidator[];
    multipleValues?: boolean;
    predefinedValues?: {
        enabled: boolean;
        values: { label: string; value: string }[];
    };
    settings?: { [key: string]: any };
    renderer: {
        name: string;
    };
};

export type CmsEditorFieldId = string;
export type CmsEditorFieldsLayout = CmsEditorFieldId[][];

export interface CmsEditorContentModel {
    id: CmsEditorFieldId;
    group: {
        id: string;
        name: string;
    };
    version: number;
    layout?: CmsEditorFieldsLayout;
    fields: CmsEditorField[];
    lockedFields: CmsEditorField[];
    name: string;
    modelId: string;
    titleFieldId: string;
    settings: any;
    status: string;
    savedOn: string;
    revisions: any[];
    meta: any;
}

export interface CmsEditorContentEntry {
    id: string;
    savedOn: string;
    [key: string]: any;
    meta: {
        title: string;
        locked: boolean;
        status: "draft" | "published" | "unpublished" | "changesRequested" | "reviewRequested";
        version: number;
    };
}

export interface CmsEditorFieldValidator {
    name: string;
    message: string;
    settings: any;
}

export interface CmsEditorFieldValidatorPlugin extends Plugin {
    type: "cms-editor-field-validator";
    validator: {
        name: string;
        label: string;
        description: string;
        defaultMessage: string;
        renderSettings?: (props: {
            Bind: BindComponent;
            setValue: (name: string, value: any) => void;
            setMessage: (message: string) => void;
            data: CmsEditorFieldValidator;
        }) => React.ReactElement;
    };
}

export type CmsEditorContentTab = React.FunctionComponent<{ activeTab: boolean }>;

// ------------------------------------------------------------------------------------------------------------

export interface CmsContentModelFormProps {
    loading?: boolean;
    onForm?: (form: any) => void;
    contentModel: CmsEditorContentModel;
    entry?: { [key: string]: any };
    onSubmit?: (data: { [key: string]: any }) => any;
    onChange?: (data: { [key: string]: any }) => any;
}

export interface CmsEditorFieldOptionPlugin extends Plugin {
    type: "cms-editor-field-option";
    render(): ReactElement;
}

export interface CmsContentDetailsPlugin extends Plugin {
    render: (params: any) => ReactNode;
}

export interface CmsContentDetailsRevisionContentPlugin extends Plugin {
    type: "cms-content-details-revision-content";
    render(params: any): ReactElement;
}

export interface CmsFormFieldPatternValidatorPlugin extends Plugin {
    type: "cms-editor-field-validator-pattern";
    pattern: {
        name: string;
        message: string;
        label: string;
    };
}

export interface CmsFormFieldValidator {
    name: string;
    message: any;
    settings: any;
}

export interface CmsFormFieldValidatorPlugin extends Plugin {
    type: "form-field-validator";
    validator: {
        name: string;
        validate: (value: any, validator: CmsFormFieldValidator) => Promise<any>;
    };
}

export interface FieldLayoutPosition {
    row: number;
    index: number;
}

export interface CmsEditorFormSettingsPlugin extends Plugin {
    type: "content-model-editor-form-settings";
    title: string;
    description: string;
    icon: React.ReactElement;
    render(props: { Bind: BindComponent; form: Form; formData: any }): React.ReactNode;
    renderHeaderActions?(props: {
        Bind: BindComponent;
        form: Form;
        formData: any;
    }): React.ReactNode;
}

export interface CmsIcon {
    /**
     * [ pack, icon ], ex: ["fab", "cog"]
     */
    id: [IconPrefix, IconName];
    /**
     * Icon name
     */
    name: string;
    /**
     * SVG element
     */
    svg: ReactElement;
}

export interface CmsIconsPlugin extends Plugin {
    type: "cms-icons";
    getIcons(): CmsIcon[];
}

export interface UseContentModelEditorReducerState {
    apolloClient: ApolloClient<any>;
    id: string;
}

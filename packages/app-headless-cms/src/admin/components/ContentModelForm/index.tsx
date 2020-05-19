import React from "react";
import { I18NValue } from "@webiny/app-i18n/components";
import { getPlugins } from "@webiny/plugins";
import { cloneDeep, pick } from "lodash";
import { ContentModelFormRender } from "./ContentModelFormRender";

import {
    CmsContentModelFormProps,
    CmsFormFieldValidatorPlugin
} from "@webiny/app-headless-cms/types";

export const ContentModelForm: React.FC<CmsContentModelFormProps> = props => {
    const { contentModel: contentModelRaw } = props;

    const contentModel = cloneDeep(contentModelRaw);
    const { layout, fields } = contentModel;

    const getFieldById = id => {
        return fields.find(field => field._id === id);
    };

    const getFields = () => {
        const fields: any = cloneDeep(layout);
        const validatorPlugins: CmsFormFieldValidatorPlugin[] = getPlugins("form-field-validator");

        fields.forEach(row => {
            row.forEach((id, idIndex) => {
                row[idIndex] = getFieldById(id);

                row[idIndex].validators = row[idIndex].validation
                    .map(item => {
                        const validatorPlugin = validatorPlugins.find(
                            plugin => plugin.validator.name === item.name
                        );

                        if (
                            !validatorPlugin ||
                            typeof validatorPlugin.validator.validate !== "function"
                        ) {
                            return;
                        }

                        return async value => {
                            let isInvalid;
                            try {
                                const result = await validatorPlugin.validator.validate(
                                    value,
                                    item
                                );
                                isInvalid = result === false;
                            } catch (e) {
                                isInvalid = true;
                            }

                            if (isInvalid) {
                                throw new Error(
                                    I18NValue({ value: item.message }) || "Invalid value."
                                );
                            }
                        };
                    })
                    .filter(Boolean);
            });
        });
        return fields;
    };

    const getDefaultValues = (overrides = {}) => {
        const values = {};
        fields.forEach(field => {
            const fieldId = field.fieldId;

            if (
                fieldId &&
                "defaultValue" in field.settings &&
                typeof field.settings.defaultValue !== "undefined"
            ) {
                values[fieldId] = field.settings.defaultValue;
            }
        });
        return { ...values, ...overrides };
    };

    const { content, onSubmit, onChange, locale, onForm } = props;

    return (
        <ContentModelFormRender
            onForm={onForm}
            locale={locale}
            getFields={getFields}
            getDefaultValues={getDefaultValues}
            content={content}
            onChange={onChange}
            onSubmit={async data => {
                const fieldsIds = contentModel.fields.map(item => item.fieldId);
                onSubmit(pick(data, [...fieldsIds]));
            }}
        />
    );
};

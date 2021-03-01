import React from "react";
import get from "lodash/get";
import { CmsEditorFieldRendererPlugin } from "../../../../types";
import { i18n } from "@webiny/app/i18n";
import { ReactComponent as DeleteIcon } from "../../../icons/close.svg";
import DynamicSection from "../DynamicSection";
import DateTimeWithoutTimezone from "./DateTimeWithoutTimezone";
import DateTimeWithTimezone from "./DateTimeWithTimezone";
import Time from "./Time";
import Input from "./Input";

const t = i18n.ns("app-headless-cms/admin/fields/date-time");

const plugin: CmsEditorFieldRendererPlugin = {
    type: "cms-editor-field-renderer",
    name: "cms-editor-field-renderer-date-times",
    renderer: {
        rendererName: "date-time-inputs",
        name: t`Date/Time Inputs`,
        description: t`Renders inputs for various formats of dates and times.`,
        canUse({ field }) {
            return (
                field.type === "datetime" &&
                field.multipleValues &&
                !get(field, "predefinedValues.enabled")
            );
        },
        render(props) {
            const { field } = props;

            return (
                <DynamicSection {...props}>
                    {({ bind, index }) => {
                        const trailingIcon = index > 0 && {
                            icon: <DeleteIcon />,
                            onClick: () => bind.field.removeValue(index)
                        };

                        if (field.settings.type === "dateTimeWithoutTimezone") {
                            return (
                                <DateTimeWithoutTimezone
                                    field={field}
                                    bind={bind.index}
                                    trailingIcon={trailingIcon}
                                />
                            );
                        }
                        if (field.settings.type === "dateTimeWithTimezone") {
                            return (
                                <DateTimeWithTimezone
                                    field={field}
                                    bind={bind.index}
                                    trailingIcon={trailingIcon}
                                />
                            );
                        }
                        if (field.settings.type === "time") {
                            return (
                                <Time
                                    field={{
                                        ...props.field,
                                        label:
                                            props.field.label +
                                            t` Value {number}`({ number: index + 1 })
                                    }}
                                    bind={bind.index}
                                    label={t`Value {number}`({ number: index + 1 })}
                                    trailingIcon={trailingIcon}
                                />
                            );
                        }

                        return (
                            <Input
                                bind={bind.index}
                                field={{
                                    ...props.field,
                                    label:
                                        props.field.label +
                                        t` Value {number}`({ number: index + 1 })
                                }}
                                type={field.settings.type}
                                trailingIcon={trailingIcon}
                            />
                        );
                    }}
                </DynamicSection>
            );
        }
    }
};

export default plugin;

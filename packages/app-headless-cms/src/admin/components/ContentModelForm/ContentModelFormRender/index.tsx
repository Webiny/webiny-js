import React, { useEffect, useRef } from "react";
import Input from "./fields/Input";
import Textarea from "./fields/Textarea";
import Switch from "./fields/Switch";
import Time from "./fields/Time";
import DateTimeWithoutTimezone from "./fields/DateTimeWithoutTimezone";
import DateTimeWithTimezone from "./fields/DateTimeWithTimezone";
import { BindComponentRenderProp, Form } from "@webiny/form";
import { CmsEditorField } from "@webiny/app-headless-cms/types";
import { Grid, Cell } from "@webiny/ui/Grid";
import cloneDeep from "lodash.clonedeep";
import get from "lodash.get";

import { CircularProgress } from "@webiny/ui/Progress";

const setValue = ({ value, bind, locale }) => {
    const newValue = cloneDeep({ values: [], ...bind.value });
    const index = value ? newValue.values.findIndex(item => item.locale === locale) : -1;
    if (index >= 0) {
        newValue.values[index].value = value;
    } else {
        newValue.values.push({ locale: locale, value: value });
    }

    // Filter out redundant empty values.
    newValue.values = newValue.values.filter(item => !!item.value);
    bind.onChange(newValue);
};

const getValue = ({ bind, locale }) => {
    const value = get(bind, "value.values", []).find(item => item.locale === locale);
    return value ? value.value : null;
};

const renderFieldElement = (props: { field: CmsEditorField; bind: BindComponentRenderProp }) => {
    switch (props.field.type) {
        case "text":
            return <Input {...props} />;
        case "long-text":
            return <Textarea {...props} />;
        case "number":
            return <Input {...props} type="number" />;
        case "boolean":
            return <Switch {...props} />;
        case "datetime":
            if (props.field.settings.type === "dateTimeWithoutTimezone") {
                return <DateTimeWithoutTimezone {...props} />;
            }
            if (props.field.settings.type === "dateTimeWithTimezone") {
                return <DateTimeWithTimezone {...props} />;
            }
            if (props.field.settings.type === "time") {
                return <Time {...props} />;
            }
            return <Input {...props} type={props.field.settings.type} />;
        // ---
        default:
            return <span>Cannot render field.</span>;
    }
};

const renderFieldCell = ({ field, Bind, row, locale }) => {
    return (
        <Cell span={Math.floor(12 / row.length)} key={field._id}>
            <Bind name={field.fieldId} validators={field.validators}>
                {bind =>
                    renderFieldElement({
                        field,
                        bind: {
                            ...bind,
                            value: getValue({ bind, locale }),
                            onChange: value => setValue({ value, bind, locale })
                        }
                    })
                }
            </Bind>
        </Cell>
    );
};

export const ContentModelFormRender = ({
    getFields,
    getDefaultValues,
    loading = false,
    content,
    onSubmit,
    onChange,
    locale,
    onForm = null
}) => {
    // All form fields - an array of rows where each row is an array that contain fields.
    const fields = getFields();
    const ref = useRef(null);

    useEffect(() => {
        typeof onForm === "function" && onForm(ref.current);
    }, []);

    return (
        <Form
            onChange={onChange}
            onSubmit={onSubmit}
            data={content ? content : getDefaultValues()}
            ref={ref}
        >
            {({ Bind }) => (
                <div data-testid={"cms-content-form"}>
                    {loading && <CircularProgress />}
                    <Grid>
                        {/* Let's render all form fields. */}
                        {fields.map((row, rowIndex) => (
                            <React.Fragment key={rowIndex}>
                                {row.map(field => renderFieldCell({ field, Bind, row, locale }))}
                            </React.Fragment>
                        ))}
                    </Grid>
                </div>
            )}
        </Form>
    );
};

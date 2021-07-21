import React, { Fragment } from "react";
import { Form, FormOnSubmit, FormRenderPropParams } from "@webiny/form";
import { Element, ElementConfig } from "@webiny/ui-composer/Element";

interface FormElementConfig extends ElementConfig {
    onSubmit: FormOnSubmit;
    getData(): Record<string, any>;
    getInvalidFields?(): Record<string, any>;
    isDisabled?(): boolean;
    onChange?: FormOnSubmit;
    onInvalid?: () => void;
    submitOnEnter?: boolean;
    validateOnFirstSubmit?: boolean;
}

export interface FormElementRenderProps {
    formProps: FormRenderPropParams;
}

export class FormElement extends Element<FormElementConfig> {
    constructor(id, config) {
        super(id, config);

        this.toggleGrid(false);
    }

    render(props) {
        return (
            <Form onSubmit={this.config.onSubmit} data={this.config.getData()}>
                {formProps => <Fragment>{super.render({ ...props, formProps })}</Fragment>}
            </Form>
        );
    }
}

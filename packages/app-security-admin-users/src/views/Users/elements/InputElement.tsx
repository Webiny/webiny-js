import React from "react";
import { FormRenderPropParams, BindComponentProps } from "@webiny/form";
import { Input } from "@webiny/ui/Input";
import { Element, ElementConfig } from "@webiny/ui-composer/Element";

export interface InputConfig<TRenderProps> extends ElementConfig<TRenderProps> {
    label: string;
    validators?: Function;
    beforeChange?: BindComponentProps["beforeChange"];
    defaultValue?: any;
    isDisabled?: boolean | IsDisabled
}

export interface InputElementRenderProps {
    formProps: FormRenderPropParams;
}

interface IsDisabled {
    (props: InputElementRenderProps): boolean;
}

export class InputElement extends Element<InputConfig<InputElementRenderProps>> {
    setLabel(label: string) {
        this.config.label = label;
    }

    setIsDisabled(isDisabled: boolean | IsDisabled) {
        this.config.isDisabled = isDisabled;
    }

    protected isDisabled(props: InputElementRenderProps): boolean {
        if (typeof this.config.isDisabled === "function") {
            return this.config.isDisabled(props);
        }

        return this.config.isDisabled;
    }

    render(props: InputElementRenderProps): React.ReactNode {
        if (!props.formProps) {
            throw Error(`InputElement must be placed inside of a FormElement.`);
        }

        const { Bind } = props.formProps;

        return (
            <Bind name={this.id} validators={this.config.validators}>
                <Input label={this.config.label} disabled={this.isDisabled(props)} />
            </Bind>
        );
    }
}

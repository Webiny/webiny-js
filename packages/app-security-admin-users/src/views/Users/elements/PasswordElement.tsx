import React, { Fragment } from "react";
import { InputElement, InputElementRenderProps } from "./InputElement";

export class PasswordElement extends InputElement {
    render(props: InputElementRenderProps): React.ReactElement {
        if (!props.formProps) {
            throw Error(`PasswordElement must be placed inside of a FormElement.`);
        }

        const { Bind } = props.formProps;

        return (
            <Bind name={this.id}>
                {({ value, onChange }) => (
                    <Fragment>
                        <label>{this.config.label}</label>
                        <input
                            type="password"
                            disabled={this.isDisabled(props)}
                            value={value || ""}
                            onChange={e => onChange(e.target.value)}
                        />
                    </Fragment>
                )}
            </Bind>
        );
    }
}

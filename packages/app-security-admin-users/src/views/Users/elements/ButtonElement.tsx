import React from "react";
import { ButtonDefault, ButtonPrimary } from "@webiny/ui/Button";
import { Element, ElementConfig } from "@webiny/ui-composer/Element";

interface ButtonConfig<TRenderProps> extends ElementConfig {
    type: "default" | "primary";
    label: string;
    onClick: (props: TRenderProps) => void;
}

export class ButtonElement<TRenderProps = any> extends Element<ButtonConfig<TRenderProps>> {
    render(props): React.ReactElement {
        const Component = this.config.type === "default" ? ButtonDefault : ButtonPrimary;

        return (
            <Component onClick={() => this.config.onClick(props)}>{this.config.label}</Component>
        );
    }
}

import React from "react";
import { Element } from "@webiny/ui-composer/Element";

interface Renderer<TRenderProps> {
    (props: TRenderProps): React.ReactNode;
}

export class GenericElement<TRenderProps = any> extends Element {
    private _render: Renderer<TRenderProps>;

    constructor(id, render: Renderer<TRenderProps>) {
        super(id);

        this._render = render;
    }
    render(props: TRenderProps) {
        return this._render(props);
    }
}

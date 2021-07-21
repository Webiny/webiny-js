import React from "react";
import classNames from "classnames";
import { Element } from "@webiny/ui-composer/Element";
import { Cell } from "@webiny/ui/Grid";

export class SplitViewPanelElement extends Element<any> {
    private _width = 12;
    private _classNames = new Set();

    setWidth(width: number) {
        this._width = width;
    }

    addClassName(className: string) {
        this._classNames.add(className);
    }

    removeClassName(className: string) {
        this._classNames.delete(className);
    }

    render(props: any) {
        return (
            <Cell span={this._width} className={classNames(Array.from(this._classNames.values()))}>
                {super.render(props)}
            </Cell>
        );
    }
}

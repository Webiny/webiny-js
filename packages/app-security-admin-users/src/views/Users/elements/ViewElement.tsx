import React from "react";
import { Element, ElementConfig } from "@webiny/ui-composer/Element";
import { View, ViewComponent } from "@webiny/ui-composer/View";

interface ViewElementConfig extends ElementConfig {
    view: View;
    hook?: Function;
}

export class ViewElement extends Element<ViewElementConfig> {
    render(props?: any): React.ReactNode {
        return <ViewComponent view={this.config.view} hook={this.config.hook} />;
    }
}

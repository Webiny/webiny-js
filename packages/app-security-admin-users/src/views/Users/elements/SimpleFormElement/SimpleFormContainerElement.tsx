import React from "react";
import classNames from "classnames";
import styled from "@emotion/styled";
import { Elevation } from "@webiny/ui/Elevation";
import { Element, ElementConfig } from "@webiny/ui-composer/Element";

const SimpleFormContainerWrapper = styled("div")({
    position: "relative",
    margin: "17px 50px"
});

interface SimpleFormContainerConfig extends ElementConfig {
    testId?: string;
    noElevation?: boolean;
    className?: string;
}

export class SimpleFormContainerElement extends Element<SimpleFormContainerConfig> {
    constructor(id: string, config: SimpleFormContainerConfig) {
        super(id, config);
        this.toggleGrid(false);
    }

    render(props) {
        const children = super.render(props);

        return (
            <SimpleFormContainerWrapper
                className={classNames("webiny-data-list", this.config.className)}
                data-testid={this.config.testId}
            >
                {this.config.noElevation ? children : <Elevation z={1}>{children}</Elevation>}
            </SimpleFormContainerWrapper>
        );
    }
}

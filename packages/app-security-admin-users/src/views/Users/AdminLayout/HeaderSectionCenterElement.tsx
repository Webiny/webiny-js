import React from "react";
import { css } from "emotion";
import { Element } from "@webiny/ui-composer/Element";
import { TopAppBarSection } from "@webiny/ui/TopAppBar";

const middleBar = css({
    width: "50%"
});

export class HeaderSectionCenterElement extends Element {
    constructor(id: string) {
        super(id);

        this.toggleGrid(false);
    }

    render(props): React.ReactNode {
        return (
            <TopAppBarSection className={middleBar} alignEnd>
                {super.render(props)}
            </TopAppBarSection>
        );
    }
}

import React from "react";
import { css } from "emotion";
import { Element } from "@webiny/ui-composer/Element";
import { TopAppBarSection } from "@webiny/ui/TopAppBar";

const edgeBars = css({
    width: "25%"
});

export class HeaderSectionRightElement extends Element {
    constructor(id: string) {
        super(id);

        this.toggleGrid(false);
    }

    render(props): React.ReactNode {
        return (
            <TopAppBarSection className={edgeBars} alignEnd>
                {super.render(props)}
            </TopAppBarSection>
        );
    }
}

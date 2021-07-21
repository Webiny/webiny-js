import React from "react";
import styled from "@emotion/styled";
import { Element } from "@webiny/ui-composer/Element";

const ButtonWrapper = styled("div")({
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid var(--mdc-theme-on-background)",
    color: "var(--mdc-theme-text-primary-on-background)",
    textAlign: "right",
    padding: 25
});

export class SimpleFormFooterElement extends Element {
    constructor(id) {
        super(id);

        this.toggleGrid(false);
    }

    render(props) {
        return <ButtonWrapper>{super.render(props)}</ButtonWrapper>;
    }
}

import React from "react";
import { Element } from "@webiny/ui-composer/Element";
import { TopAppBarPrimary, TopAppBarTitle } from "@webiny/ui/TopAppBar";
import { HeaderSectionLeftElement } from "./HeaderSectionLeftElement";
import { HeaderSectionCenterElement } from "./HeaderSectionCenterElement";
import { HeaderSectionRightElement } from "./HeaderSectionRightElement";
import { GenericElement } from "~/views/Users/elements/GenericElement";

export class HeaderElement extends Element {
    constructor(id: string) {
        super(id);

        this.toggleGrid(false);
        this.addElement(new HeaderSectionLeftElement("headerLeft"));
        this.addElement(new HeaderSectionCenterElement("headerCenter"));
        this.addElement(new HeaderSectionRightElement("headerRight"));
    }

    getLeftSection(): HeaderSectionLeftElement {
        return this.getElement("headerLeft");
    }

    getCenterSection(): HeaderSectionCenterElement {
        return this.getElement("headerCenter");
    }

    getRightSection(): HeaderSectionRightElement {
        return this.getElement("headerRight");
    }

    setLogo(logo: React.ReactElement) {
        const currentLogo = this.getElement("logo");
        if (currentLogo) {
            currentLogo.removeElement();
        }

        new GenericElement("logo", () => {
            return <TopAppBarTitle>{logo}</TopAppBarTitle>;
        }).moveToTheTopOf(this.getLeftSection());
    }

    render(props): React.ReactNode {
        return <TopAppBarPrimary fixed>{super.render(props)}</TopAppBarPrimary>;
    }
}

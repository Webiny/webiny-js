import React from "react";
import Helmet from "react-helmet";
import { plugins } from "@webiny/plugins";
import { View } from "@webiny/ui-composer/View";
import { Element } from "@webiny/ui-composer/Element";
import { HeaderElement } from "./AdminLayout/HeaderElement";
import { ContentElement } from "~/views/Users/AdminLayout/ContentElement";
import { GenericElement } from "~/views/Users/elements/GenericElement";
import { AdminViewPlugin } from "~/views/Users/AdminViewPlugin";

export class AdminView extends View {
    private _title: string;

    constructor() {
        super("admin-layout");

        this.toggleGrid(false);
        this.addElements();

        // Apply plugins
        plugins.byType<AdminViewPlugin>(AdminViewPlugin.type).forEach(plugin => plugin.apply(this));
    }

    setTitle(title: string) {
        this._title = title;
    }

    setLogo(logo: React.ReactElement) {
        this.getHeaderElement().setLogo(logo);
    }

    setContentElement(element: Element) {
        const content = this.getContentElement();

        // Remove previous content
        content.getElements().forEach(el => el.removeElement());

        // Add new content
        content.addElement(element);
    }

    getHeaderElement(): HeaderElement {
        return this.getElement("header");
    }

    getContentElement(): ContentElement {
        return this.getElement("content");
    }

    private addElements() {
        this.addElement(
            new GenericElement("helmet", () => {
                return <Helmet title={this._title} />;
            })
        );

        this.addElement(new HeaderElement("header"));
        this.addElement(new ContentElement("content"));
    }
}

import React from "react";
import { Element, ElementConfig } from "@webiny/ui-composer/Element";
import { Accordion, AccordionItem } from "@webiny/ui/Accordion";

interface Item extends ElementConfig {
    id: string;
    title: string;
    description: string;
    icon: React.ReactElement;
    open?: boolean;
}

export class AccordionItemElement extends Element<Item> {
    constructor(id, config: Item) {
        super(id, config);
    }

    setTitle(title: string) {
        this.config.title = title;
    }

    setDescription(description: string) {
        this.config.description = description;
    }

    render(props) {
        return <AccordionItem {...this.config}>{super.render(props)}</AccordionItem>;
    }
}

interface Config extends ElementConfig {
    items: Item[];
}

export class AccordionElement extends Element<Config> {
    constructor(id, config: Config) {
        super(id, config);

        this.toggleGrid(false);

        this.config.items.forEach(item => {
            this.addElement(new AccordionItemElement(item.id, item));
        });
    }

    getAccordionItemElement(id: string): AccordionItemElement {
        return this.getElement(id);
    }

    render(props) {
        // @ts-ignore
        return <Accordion elevation={0}>{super.render(props)}</Accordion>;
    }
}

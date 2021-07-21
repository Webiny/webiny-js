import React from "react";
import { FormOnSubmit } from "@webiny/form";
import { CircularProgress } from "@webiny/ui/Progress";
import { ButtonElement } from "~/views/Users/elements/ButtonElement";
import { Element, ElementConfig } from "@webiny/ui-composer/Element";
import { GenericElement } from "~/views/Users/elements/GenericElement";
import { FormElement, FormElementRenderProps } from "~/views/Users/elements/FormElement";
import { SimpleFormContentElement } from "./SimpleFormElement/SimpleFormContentElement";
import { SimpleFormHeaderElement } from "./SimpleFormElement/SimpleFormHeaderElement";
import { SimpleFormFooterElement } from "./SimpleFormElement/SimpleFormFooterElement";
import { SimpleFormContainerElement } from "./SimpleFormElement/SimpleFormContainerElement";

export type SimpleFormElementRenderProps = FormElementRenderProps;

interface SimpleFormElementConfig extends ElementConfig {
    onSubmit: FormOnSubmit;
    getTitle: (props: SimpleFormElementRenderProps) => string;
    getFormData: () => Record<string, any>;
    isLoading: () => boolean;
    onCancel: () => void;
    testId?: string;
    noElevation?: boolean;
    className?: string;
}

export class SimpleFormElement extends Element<SimpleFormElementConfig> {
    constructor(id, config: SimpleFormElementConfig) {
        super(id, config);

        this.addElements();
        this.toggleGrid(false);
    }

    render(props: any): React.ReactNode {
        return super.render({ ...props });
    }

    addElement(element: Element<any>): Element<any> {
        if (element.id === "form") {
            return super.addElement(element);
        }

        return this.getFormContainer().addElement(element);
    }

    getFormContainer(): SimpleFormContainerElement {
        return this.getElement("formContainer");
    }

    getFormContentElement(): SimpleFormContentElement {
        return this.getElement("formContent");
    }

    getFormHeaderElement(): SimpleFormHeaderElement {
        return this.getElement("formHeader");
    }

    getFormFooterElement(): SimpleFormFooterElement {
        return this.getElement("formFooter");
    }

    getSubmitButtonElement(): ButtonElement {
        return this.getFormFooterElement().getElement("submit");
    }

    private addElements() {
        const form = this.addElement(
            new FormElement("form", {
                onSubmit: (data, form) => this.config.onSubmit(data, form),
                getData: () => this.config.getFormData()
            })
        ) as FormElement;

        form.addElement(
            new SimpleFormContainerElement("formContainer", {
                testId: this.config.testId,
                className: this.config.className,
                noElevation: this.config.noElevation
            })
        );

        this.addElement(
            new GenericElement("loading", () => {
                return this.config.isLoading() ? <CircularProgress /> : null;
            })
        );

        this.addElement(
            new SimpleFormHeaderElement("formHeader", {
                getTitle: props => {
                    return this.config.getTitle(props);
                }
            })
        );

        this.addElement(new SimpleFormContentElement("formContent"));

        const footer = new SimpleFormFooterElement("formFooter");
        this.addElement(footer);

        const cancelButton = footer.addElement(
            new ButtonElement("cancel", {
                type: "default",
                label: "Cancel",
                onClick: () => this.config.onCancel()
            })
        );

        const submitButton = new ButtonElement<SimpleFormElementRenderProps>("submit", {
            type: "primary",
            label: "Save user",
            onClick: props => {
                props.formProps.submit();
            }
        });
        submitButton.moveToTheRightOf(cancelButton);
    }
}

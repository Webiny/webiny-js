// @ts-nocheck
import React from "react";
import styled from "@emotion/styled";
import { UsersFormViewPlugin } from "@webiny/app-security-admin-users/views/Users/UsersFormViewPlugin";
import { UsersFormView } from "@webiny/app-security-admin-users/views/Users/UsersFormView";
import { SimpleFormElement } from "@webiny/app-security-admin-users/views/Users/elements/SimpleFormElement";
import { GenericElement } from "@webiny/app-security-admin-users/views/Users/elements/GenericElement";
import { ButtonElement } from "@webiny/app-security-admin-users/views/Users/elements/ButtonElement";

const FormWrapper = styled("div")({
    margin: "0 100px"
});

export class MyUserFormPlugin extends UsersFormViewPlugin {
    apply(view: UsersFormView): void {
        // view.disableGrid();
        // view.wrapWith(FormWrapper);
        ///////////////////////////////////////////////////////////
        const form = view.getElement<SimpleFormElement>("form");

        form.insertElementAbove(
            form.getFormHeaderElement(),
            new GenericElement("banner", ({ viewProps }) => {
                return <pre>{JSON.stringify(viewProps.user, null, 4)}</pre>;
            })
        );
        const submitButton = form.getSubmitButtonElement();
        form.getFormFooterElement().insertElementToTheLeftOf(
            submitButton,
            new ButtonElement("export", {
                type: "default",
                label: "Export",
                onClick: () => {
                    alert("Export record to PDF!");
                }
            })
        );
    }
}

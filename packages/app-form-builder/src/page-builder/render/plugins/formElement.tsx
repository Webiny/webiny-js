import React from "react";
import { Form as FormsForm } from "../../../components/Form";
import { get } from "lodash";
import { PbRenderElementPlugin } from "@webiny/app-page-builder/types";

export default {
    name: "pb-render-page-element-form",
    type: "pb-render-page-element",
    elementType: "form",
    render({ element }) {
        let render = <span>Cannot render form, ID missing.</span>;

        const form = get(element, "data.settings.form") || {
            revision: null
        };

        if (form.revision) {
            const props = {
                parentId: null,
                revisionId: null
            };

            if (form.revision === "latest") {
                props.parentId = form.parent;
            } else {
                props.revisionId = form.revision;
            }

            render = <FormsForm {...props} />;
        }

        return render;
    }
} as PbRenderElementPlugin;

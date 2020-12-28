import React from "react";
import Block from "./Block";
import {
    CreateElementActionEvent,
    DeleteElementActionEvent,
    updateElementAction
} from "@webiny/app-page-builder/editor/recoil/actions";
import { EventActionHandlerActionCallableResponseType } from "@webiny/app-page-builder/editor/recoil/eventActions";
import {
    addElementToParentHelper,
    createDroppedElementHelper
} from "@webiny/app-page-builder/editor/helpers";
import { PbEditorPageElementPlugin, PbElement } from "@webiny/app-page-builder/types";
import { AfterDropElementActionEvent } from "@webiny/app-page-builder/editor/recoil/actions/afterDropElement";
import { createInitialPerDeviceSettingValue } from "../../elementSettings/elementSettingsUtils";

export default (): PbEditorPageElementPlugin => {
    return {
        name: "pb-editor-page-element-block",
        type: "pb-editor-page-element",
        elementType: "block",
        settings: [
            "pb-editor-page-element-style-settings-background",
            "pb-editor-page-element-style-settings-animation",
            "pb-editor-page-element-style-settings-border",
            "pb-editor-page-element-style-settings-shadow",
            "pb-editor-page-element-style-settings-padding",
            "pb-editor-page-element-style-settings-margin",
            "pb-editor-page-element-style-settings-width",
            "pb-editor-page-element-style-settings-height",
            "pb-editor-page-element-style-settings-horizontal-align-flex",
            "pb-editor-page-element-style-settings-vertical-align",
            "pb-editor-page-element-settings-clone",
            "pb-editor-page-element-settings-delete"
        ],
        create(options = {}) {
            return {
                type: "block",
                elements: [],
                data: {
                    settings: {
                        width: createInitialPerDeviceSettingValue({ value: "100%" }),
                        margin: {
                            ...createInitialPerDeviceSettingValue({
                                top: "0px",
                                right: "0px",
                                bottom: "0px",
                                left: "0px",
                                advanced: true
                            })
                        },
                        padding: createInitialPerDeviceSettingValue({ all: "10px" }),
                        horizontalAlignFlex: createInitialPerDeviceSettingValue("flex-start"),
                        verticalAlign: createInitialPerDeviceSettingValue("start")
                    }
                },
                ...options
            };
        },
        render(props) {
            return <Block {...props} />;
        },
        // This callback is executed when another element is dropped on the drop zones with type "block"
        onReceived({ source, target, position = null, state, meta }) {
            const { element, dispatchCreateElementAction = false } = createDroppedElementHelper(
                source as any,
                target
            );

            const block = addElementToParentHelper(element, target, position);

            const result = updateElementAction(state, meta, {
                element: block,
                history: true
            }) as EventActionHandlerActionCallableResponseType;

            result.actions.push(
                new AfterDropElementActionEvent({
                    element
                })
            );

            if (source.path) {
                result.actions.push(
                    new DeleteElementActionEvent({
                        element: source as PbElement
                    })
                );
            }

            if (!dispatchCreateElementAction) {
                return result;
            }
            result.actions.push(
                new CreateElementActionEvent({
                    element,
                    source: source as PbElement
                })
            );
            return result;
        }
    };
};

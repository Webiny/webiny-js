import React from "react";
import CellContainer from "./CellContainer";
import { executeAction } from "@webiny/app-page-builder/editor/recoil/eventActions";
import { UpdateElementActionArgsType } from "@webiny/app-page-builder/editor/recoil/actions/updateElement/types";
import {
    CreateElementActionEvent,
    DeleteElementActionEvent,
    updateElementAction
} from "@webiny/app-page-builder/editor/recoil/actions";
import {
    addElementToParent,
    createDroppedElement,
    createElement
} from "@webiny/app-page-builder/editor/helpers";
import {
    DisplayMode,
    PbEditorPageElementPlugin,
    PbEditorPageElementSaveActionPlugin,
    PbEditorElement
} from "@webiny/app-page-builder/types";
import { Plugin } from "@webiny/plugins/types";
import { AfterDropElementActionEvent } from "@webiny/app-page-builder/editor/recoil/actions/afterDropElement";
import { createInitialPerDeviceSettingValue } from "../../elementSettings/elementSettingsUtils";

const cellPlugin: PbEditorPageElementPlugin = {
    type: "pb-editor-page-element",
    name: "pb-editor-page-element-cell",
    elementType: "cell",
    settings: [
        "pb-editor-page-element-style-settings-background",
        "pb-editor-page-element-style-settings-animation",
        "pb-editor-page-element-style-settings-border",
        "pb-editor-page-element-style-settings-shadow",
        "pb-editor-page-element-style-settings-padding",
        "pb-editor-page-element-style-settings-margin"
    ],
    canDelete: () => {
        return false;
    },
    create: (options = {}) => {
        return {
            type: "cell",
            elements: [],
            data: {
                settings: {
                    margin: {
                        ...createInitialPerDeviceSettingValue(
                            {
                                top: "0px",
                                right: "0px",
                                bottom: "0px",
                                left: "0px",
                                advanced: true
                            },
                            DisplayMode.DESKTOP
                        )
                    },
                    padding: createInitialPerDeviceSettingValue(
                        { all: "0px" },
                        DisplayMode.DESKTOP
                    ),
                    grid: {
                        size: options.data?.settings?.grid?.size || 1
                    }
                }
            }
        };
    },
    onReceived({ source, position, target, state, meta }) {
        const element = createDroppedElement(source as any, target);
        const parent = addElementToParent(element, target, position);

        const result = executeAction<UpdateElementActionArgsType>(
            state,
            meta,
            updateElementAction,
            {
                element: parent,
                history: true
            }
        );

        result.actions.push(new AfterDropElementActionEvent({ element }));

        if (source.id) {
            // Delete source element
            result.actions.push(
                new DeleteElementActionEvent({
                    element: source as PbEditorElement
                })
            );

            return result;
        }

        result.actions.push(
            new CreateElementActionEvent({
                element,
                source: source as PbEditorElement
            })
        );

        return result;
    },
    render(props) {
        return <CellContainer {...props} elementId={props.element.id} />;
    }
};
// this is required because when saving cell element it cannot be without grid element
const saveActionPlugin = {
    type: "pb-editor-page-element-save-action",
    name: "pb-editor-page-element-save-action-cell",
    elementType: "cell",
    onSave(element) {
        return createElement("grid", {
            data: {
                settings: {
                    grid: {
                        cellsType: "12"
                    }
                }
            },
            elements: [
                {
                    ...element,
                    data: {
                        ...element.data,
                        settings: {
                            ...element.data.settings,
                            grid: {
                                size: "12"
                            }
                        }
                    }
                }
            ]
        });
    }
} as PbEditorPageElementSaveActionPlugin;

export default (): Plugin[] => [cellPlugin, saveActionPlugin];

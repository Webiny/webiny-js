import React from "react";
import Quote, { className } from "./Quote";
import { DisplayMode, PbEditorPageElementPlugin } from "@webiny/app-page-builder/types";
import { createInitialTextValue } from "../utils/textUtils";
import { createInitialPerDeviceSettingValue } from "../../elementSettings/elementSettingsUtils";

export default (): PbEditorPageElementPlugin => {
    const defaultText = "Block Quote";
    return {
        name: "pb-editor-page-element-quote",
        type: "pb-editor-page-element",
        elementType: "quote",
        toolbar: {
            title: "Quote",
            group: "pb-editor-element-group-basic",
            preview() {
                return (
                    <div className={className}>
                        <blockquote>
                            <q>{defaultText}</q>
                        </blockquote>
                    </div>
                );
            }
        },
        settings: [
            "pb-editor-page-element-style-settings-text",
            "pb-editor-page-element-style-settings-background",
            "pb-editor-page-element-style-settings-border",
            "pb-editor-page-element-style-settings-shadow",
            "pb-editor-page-element-style-settings-padding",
            "pb-editor-page-element-style-settings-margin",
            "pb-editor-page-element-settings-clone",
            "pb-editor-page-element-settings-delete"
        ],
        target: ["cell", "block"],
        create({ content = {}, ...options }) {
            const previewText = content.text || `<blockquote><q>${defaultText}</q></blockquote>`;

            return {
                type: "quote",
                elements: [],
                data: {
                    text: {
                        ...createInitialPerDeviceSettingValue(
                            createInitialTextValue({
                                type: this.elementType
                            }),
                            DisplayMode.DESKTOP
                        ),
                        data: {
                            text: previewText
                        }
                    },
                    settings: {
                        margin: createInitialPerDeviceSettingValue(
                            { all: "0px" },
                            DisplayMode.DESKTOP
                        ),
                        padding: createInitialPerDeviceSettingValue(
                            { all: "0px" },
                            DisplayMode.DESKTOP
                        )
                    }
                },
                ...options
            };
        },
        render({ element }) {
            return <Quote elementId={element.id} />;
        }
    };
};

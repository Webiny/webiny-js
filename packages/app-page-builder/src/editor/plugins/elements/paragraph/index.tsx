import React from "react";
import loremIpsum from "lorem-ipsum";
import { DisplayMode, PbEditorPageElementPlugin } from "../../../../types";
import Text, { textClassName } from "./Paragraph";
import { createInitialTextValue } from "../utils/textUtils";
import { createInitialPerDeviceSettingValue } from "../../elementSettings/elementSettingsUtils";

export default (): PbEditorPageElementPlugin => {
    const defaultLipsum = {
        count: 1,
        units: "paragraphs",
        paragraphLowerBound: 2,
        paragraphUpperBound: 2,
        sentenceLowerBound: 10,
        sentenceUpperBound: 10
    };

    return {
        name: "pb-editor-page-element-paragraph",
        type: "pb-editor-page-element",
        elementType: "paragraph",
        toolbar: {
            title: "Paragraph",
            group: "pb-editor-element-group-basic",
            preview() {
                const previewText = loremIpsum(defaultLipsum);

                return <p className={textClassName}>{previewText}</p>;
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
            const previewText = content.text || loremIpsum(content.lipsum || defaultLipsum);

            return {
                type: "paragraph",
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
            return <Text elementId={element.id} />;
        }
    };
};

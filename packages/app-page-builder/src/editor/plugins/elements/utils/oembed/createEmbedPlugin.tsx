import * as React from "react";
import { BindComponent } from "@webiny/form";
import OEmbed, { OEmbedProps } from "../../../../components/OEmbed";
import {
    PbEditorElement,
    PbEditorPageElementPlugin,
    PbEditorPageElementAdvancedSettingsPlugin,
    DisplayMode
} from "../../../../../types";
import { createInitialPerDeviceSettingValue } from "../../../elementSettings/elementSettingsUtils";

type EmbedPluginConfig = {
    type: string;
    toolbar?: {
        title?: string;
        group?: string;
        preview?: () => React.ReactNode;
    };
    render?: ({ element }) => React.ReactNode;
    oembed?: {
        global?: string;
        sdk?: string;
        // onData?: Function;
        onData?: (data: { [key: string]: any }) => { [key: string]: any };
        renderEmbed?: (props: OEmbedProps) => React.ReactElement;
        init?: (params: { node: HTMLElement }) => void;
    };
    settings?: Array<string>;
    target?: Array<string>;
    onCreate?: string;
    renderElementPreview?: (params: {
        element: PbEditorElement;
        width: number;
        height: number;
    }) => React.ReactElement;
};

export const createEmbedPlugin = (config: EmbedPluginConfig): PbEditorPageElementPlugin => {
    return {
        name: "pb-editor-page-element-" + config.type,
        type: "pb-editor-page-element",
        elementType: config.type,
        toolbar: config.toolbar,
        settings: config.settings || ["pb-editor-page-element-settings-delete"],
        target: config.target || ["cell", "block", "list-item"],
        // eslint-disable-next-line
        create({ content = {}, ...options }) {
            return {
                type: config.type,
                elements: [],
                data: {
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
        render(props) {
            if (config.render) {
                return config.render(props);
            }

            return <OEmbed element={props.element} {...(config.oembed || {})} />;
        },
        onCreate: config.onCreate || "open-settings",
        renderElementPreview: config.renderElementPreview
    };
};

type EmbedPluginSidebarConfig = {
    type: string;
    render(params?: { Bind: BindComponent; submit: () => void }): React.ReactElement;
};

export const createEmbedSettingsPlugin = ({
    type,
    render
}: EmbedPluginSidebarConfig): PbEditorPageElementAdvancedSettingsPlugin => {
    return {
        name: "pb-editor-page-element-advanced-settings-" + type,
        type: "pb-editor-page-element-advanced-settings",
        elementType: type,
        render
    };
};

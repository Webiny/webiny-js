import React, { ComponentType, ReactElement, ReactNode } from "react";
import { DragObjectWithTypeWithTargetType } from "@webiny/app-page-builder/editor/components/Droppable";
import {
    EventActionHandler,
    EventActionHandlerActionCallableResponseType,
    EventActionHandlerMetaType
} from "@webiny/app-page-builder/editor/recoil/eventActions";
import { PluginsAtomType } from "@webiny/app-page-builder/editor/recoil/modules";
import { PbState } from "@webiny/app-page-builder/editor/recoil/modules/types";
import { Plugin } from "@webiny/app/types";
import { BindComponent } from "@webiny/form/Bind";
import { IconPrefix, IconName } from "@fortawesome/fontawesome-svg-core";
import { Form } from "@webiny/form/Form";
import { Item } from "@webiny/app-admin/plugins/menu/Navigation/components";

export type PbMenuSettingsItemPlugin = Plugin & {
    type: "menu-settings-page-builder";
    render(props: { Item: typeof Item }): React.ReactNode;
};

export type PbElementDataSettingsMarginPaddingType = {
    all?: number;
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
};
export type PbElementDataSettingsBackgroundType = {
    color?: string;
    image?: {
        scaling?: string;
        position?: string;
        file?: {
            src?: string;
        };
    };
};
export type PbElementDataSettingsMarginType = {
    advanced?: boolean;
    mobile?: PbElementDataSettingsMarginPaddingType;
    desktop?: PbElementDataSettingsMarginPaddingType;
};
export type PbElementDataSettingsPaddingType = {
    advanced?: boolean;
    mobile?: PbElementDataSettingsMarginPaddingType;
    desktop?: PbElementDataSettingsMarginPaddingType;
};
export type PbElementDataSettingsBorderType = {
    width?: number;
    style?: "none" | "solid" | "dashed" | "dotted";
    radius?: number;
    borders?: {
        top?: boolean;
        right?: boolean;
        bottom?: boolean;
        left?: boolean;
    };
};
export type PbElementDataImageType = {
    width?: string | number;
    height?: string | number;
    file?: {
        id?: string;
        src?: string;
    };
    title?: string;
};
export type PbElementDataIconType = {
    id?: [string, string];
    width?: number;
    color?: string;
    svg?: string;
    position?: string;
};
export type PbElementDataSettingsFormType = {
    parent?: string;
    revision?: string;
};
export type PbElementDataSettingsType = {
    horizontalAlign?: "left" | "center" | "right" | "justify";
    horizontalAlignFlex?: "flex-start" | "center" | "flex-end";
    verticalAlign?: "start" | "center" | "end";
    margin?: PbElementDataSettingsMarginType;
    padding?: PbElementDataSettingsPaddingType;
    height?: {
        value?: number;
    };
    background?: PbElementDataSettingsBackgroundType;
    border?: PbElementDataSettingsBorderType;
    grid?: {
        cellsType?: string;
        size?: number;
    };
    columnWidth?: {
        value?: string;
    };
    width?: {
        value?: string;
    };
    className?: string;
    form?: PbElementDataSettingsFormType;
    [key: string]: any;
};
export type PbElementDataType = {
    settings?: PbElementDataSettingsType;
    // this needs to be any since editor can be changed
    text?: any;
    image?: PbElementDataImageType;
    link?: {
        href?: string;
        newTab?: boolean;
    };
    type?: string;
    icon?: PbElementDataIconType;
    source?: {
        url?: string;
    };
    oembed?: {
        source?: {
            url?: string;
        };
        html?: string;
    };
    width?: number;
    [key: string]: any;
};
type PbBaseElement = {
    id: string;
    path: string;
    type: string;
    data: PbElementDataType;
    [key: string]: any;
};
export type PbElement = PbBaseElement & {
    elements: PbElement[];
};

export type PbShallowElement = PbBaseElement & {
    elements: string[];
};

export type PbTheme = {
    colors: { [key: string]: string };
    elements: { [key: string]: any };
    typography: {
        [key: string]: {
            label: string;
            component: string | React.ComponentType<any>;
            className: string;
        };
    };
};

export type PbThemePlugin = Plugin & {
    theme: PbTheme;
};

export type PbPageLayout = {
    name: string;
    title: string;
    component: React.ComponentType<any>;
};

export type PbPageLayoutPlugin = Plugin & {
    layout: PbPageLayout;
};

export type PbDefaultPagePlugin = Plugin & {
    type: "pb-default-page";
    component: React.ComponentType<any>;
};

export type PbPageLayoutComponentPlugin = Plugin & {
    componentType: string;
    component: React.ComponentType<any>;
};

export type PbPageData = {
    title?: string;
    content: any;
    seo?: {
        title: string;
        description: string;
        meta: { name: string; content: string }[];
    };
    social?: {
        title: string;
        description: string;
        meta: { property: string; content: string }[];
        image: {
            src: string;
        };
    };
    settings?: {
        general?: {
            layout?: string;
        };
    };
};

export type PbRenderElementPlugin = Plugin & {
    type: "pb-render-page-element";
    // Name of the pb-element plugin this render plugin is handling.
    elementType: string;
    render: (params: { theme: PbTheme; element: PbElement }) => React.ReactNode;
};

export type PbPageSettingsFieldsPlugin = Plugin & {
    fields: string;
};

export type PbRenderElementStylePlugin = Plugin & {
    renderStyle: (params: {
        element: { id: string; type: string; data: { [key: string]: any } };
        style: { [key: string]: any };
    }) => { [key: string]: any };
};

export type PbRenderElementAttributesPlugin = Plugin & {
    renderAttributes: (params: {
        element: { id: string; type: string; data: { [key: string]: any } };
        attributes: { [key: string]: string };
    }) => { [key: string]: string };
};

export type PbPageElementImagesListComponentPlugin = Plugin & {
    type: "pb-page-element-images-list-component";
    title: string;
    componentName: string;
    component: ComponentType<any>;
};

export type PbPageElementPagesListComponentPlugin = Plugin & {
    type: "pb-page-element-pages-list-component";
    title: string;
    componentName: string;
    component: ComponentType<any>;
};

export type PbAddonRenderPlugin = Plugin & {
    type: "addon-render";
    component: ReactElement;
};

export type PbDocumentElementPlugin = Plugin & {
    elementType: "document";
    create(options?: any): PbElement;
    render(props): ReactElement;
};

export type PbPageDetailsRevisionContentPlugin = Plugin & {
    type: "pb-page-details-revision-content";
    render(params: { page: Record<string, any>; getPageQuery: any }): ReactElement;
};

export type PbPageDetailsHeaderRightOptionsMenuItemPlugin = Plugin & {
    type: "pb-page-details-header-right-options-menu-item";
    render(props: any): ReactElement;
};

export type PbPageDetailsRevisionContentPreviewPlugin = Plugin & {
    type: "pb-page-details-revision-content-preview";
    render(params: { page: Record<string, any>; getPageQuery: any }): ReactElement;
};

export type PbMenuItemPlugin = Plugin & {
    type: "pb-menu-item";
    menuItem: {
        /* Item type (this will be stored to DB when menu is saved) */
        type: string;
        /* Menu item title */
        title: string;
        /* Menu item icon */
        icon: ReactElement;
        /* Can other menu items become children of this item ? */
        canHaveChildren: boolean;
        /* Render function for menu item form */
        renderForm: (params: {
            data: { [key: string]: any };
            onSubmit: Function;
            onCancel: Function;
        }) => ReactElement;
    };
};

export type PbEditorPageElementGroupPlugin = Plugin & {
    type: "pb-editor-page-element-group";
    group: {
        // Title rendered in the toolbar.
        title: string;
        // Icon rendered in the toolbar.
        icon: ReactElement;
    };
};

export type PbEditorPageElementTitle = (params: { refresh: () => void }) => ReactNode;

export type PbEditorPageElementPlugin = Plugin & {
    type: "pb-editor-page-element";
    elementType: string;
    toolbar?: {
        // Element title in the toolbar.
        title?: string | PbEditorPageElementTitle;
        // Element group this element belongs to.
        group?: string;
        // A function to render an element preview in the toolbar.
        preview?: ({ theme: PbTheme }) => ReactNode;
    };
    // Help link
    help?: string;
    // Whitelist elements that can accept this element (for drag&drop interaction)
    target?: string[];
    // Array of element settings plugin names.
    settings?: Array<string>;
    // A function to create an element data structure.
    create: (options: { [key: string]: any }, parent?: PbElement) => Omit<PbElement, "id" | "path">;
    // A function to render an element in the editor.
    render: (params: { theme?: PbTheme; element: PbElement }) => ReactNode;
    // A function to check if an element can be deleted.
    canDelete?: (params: { element: PbElement }) => boolean;
    // Executed when another element is dropped on the drop zones of current element.
    onReceived?: (params: {
        state?: PbState;
        meta: EventActionHandlerMetaType;
        source: PbElement | DragObjectWithTypeWithTargetType;
        target: PbElement;
        position: number | null;
    }) => EventActionHandlerActionCallableResponseType;
    // Executed when an immediate child element is deleted
    onChildDeleted?: (params: { element: PbElement; child: PbElement }) => PbElement | undefined;
    // Executed after element was created
    onCreate?: string;
    // Render element preview (used when creating element screenshots; not all elements have a simple DOM representation
    // so this callback is used to customize the look of the element in a PNG image)
    renderElementPreview?: (params: {
        element: PbElement;
        width: number;
        height: number;
    }) => ReactElement;
};

export type PbEditorPageElementActionPlugin = Plugin & {
    type: "pb-editor-page-element-action";
    render: (params: { element: PbElement; plugin: PbEditorPageElementPlugin }) => ReactNode;
};

export type PbPageDetailsPlugin = Plugin & {
    render: (params: { [key: string]: any }) => ReactNode;
};

export type PbEditorPageSettingsPlugin = Plugin & {
    type: "pb-editor-page-settings";
    /* Settings group title */
    title: string;
    /* Settings group description */
    description: string;
    /* Settings group icon */
    icon: ReactNode;
    /* GraphQL query fields to include in the `settings` subselect */
    fields: string;
    /* Render function that handles the specified `fields` */
    render: (params: { form: Form; Bind: BindComponent }) => ReactNode;
};

export type PbIcon = {
    /**
     * [ pack, icon ], ex: ["fab", "cog"]
     */
    id: [IconPrefix, IconName];
    /**
     * Icon name
     */
    name: string;
    /**
     * SVG element
     */
    svg: ReactElement;
};

export type PbIconsPlugin = Plugin & {
    type: "pb-icons";
    getIcons(): PbIcon[];
};

export type PbEditorBarPluginShouldRenderProps = {
    plugins: PluginsAtomType;
    activeElement: any;
};

export type PbEditorBarPlugin = Plugin & {
    type: "pb-editor-bar";
    shouldRender(props: PbEditorBarPluginShouldRenderProps): boolean;
    render(): ReactElement;
};

export type PbEditorContentPlugin = Plugin & {
    type: "pb-editor-content";
    render(): ReactElement;
};

export type PbEditorDefaultBarLeftPlugin = Plugin & {
    type: "pb-editor-default-bar-left";
    render(): ReactElement;
};

export type PbEditorDefaultBarRightPlugin = Plugin & {
    type: "pb-editor-default-bar-right";
    render(): ReactElement;
};

export type PbEditorDefaultBarRightPageOptionsPlugin = Plugin & {
    type: "pb-editor-default-bar-right-page-options";
    render(): ReactElement;
};

export type PbEditorToolbarTopPlugin = Plugin & {
    type: "pb-editor-toolbar-top";
    renderAction(): ReactElement;
    renderDialog?: () => ReactElement;
    renderDrawer?: () => ReactElement;
};

export type PbEditorToolbarBottomPlugin = Plugin & {
    type: "pb-editor-toolbar-bottom";
    renderAction(): ReactElement;
    renderDialog?: () => ReactElement;
};

export type PbEditorBlockPlugin = Plugin & {
    type: "pb-editor-block";
    title: string;
    category: string;
    tags: string[];
    image: {
        src?: string;
        meta: {
            width: number;
            height: number;
            aspectRatio: number;
        };
    };
    create(): PbElement;
    preview(): ReactElement;
};

export type PbEditorBlockCategoryPlugin = Plugin & {
    type: "pb-editor-block-category";
    title: string;
    categoryName: string;
    description: string;
    icon: ReactElement;
};

export type PbEditorPageElementSettingsPlugin = Plugin & {
    type: "pb-editor-page-element-settings";
    renderAction(params: { options?: any }): ReactElement;
    renderMenu?: (params: { options?: any }) => ReactElement;
    elements?: boolean | string[];
};

export type PbEditorPageElementAdvancedSettingsPlugin = Plugin & {
    type: "pb-editor-page-element-advanced-settings";
    elementType: string;
    render(params?: { Bind: BindComponent; data: any }): ReactElement;
    onSave?: (data: FormData) => FormData;
};

export type PbEditorEventActionPlugin = Plugin & {
    type: "pb-editor-event-action-plugin";
    name: string;
    // returns an unregister event action callable
    // please have one action per plugin
    // you can register more but then unregistering won't work properly
    onEditorMount: (handler: EventActionHandler) => () => void;
    // runs when editor is unmounting
    // by default it runs unregister callable
    // but dev can do what ever and then run unregister callable - or not
    onEditorUnmount?: (handler: EventActionHandler, cb: () => void) => void;
};

export type PbEditorGridPresetPluginType = Plugin & {
    name: string;
    type: "pb-editor-grid-preset";
    cellsType: string;
    icon: React.FunctionComponent;
};
// this will run when saving the element for later use
export type PbEditorPageElementSaveActionPlugin = Plugin & {
    type: "pb-editor-page-element-save-action";
    elementType: string;
    onSave: (element: PbElement) => PbElement;
};

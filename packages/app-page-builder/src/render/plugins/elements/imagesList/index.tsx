import React from "react";
import ImagesList from "./ImagesList";
import Mosaic from "./components/Mosaic";
import { PbRenderElementPlugin } from "../../../../types";
import { PbPageElementImagesListComponentPlugin } from "../../../../types";
import { PluginCollection } from "@webiny/plugins/types";
// import Slider from "./components/Slider";

export default (): PluginCollection => [
    {
        name: "pb-render-page-element-images-list",
        type: "pb-render-page-element",
        elementType: "images-list",
        render({ element, theme }) {
            return <ImagesList data={element.data} theme={theme} />;
        }
    } as PbRenderElementPlugin,
    {
        name: "pb-page-element-images-list-component-mosaic",
        type: "pb-page-element-images-list-component",
        title: "Mosaic",
        componentName: "mosaic",
        component: Mosaic
    } as PbPageElementImagesListComponentPlugin
    /*{ TODO
        name: "pb-page-element-images-list-component-slider",
        type: "pb-page-element-images-list-component",
        title: "Slider",
        componentName: "slider",
        component: Slider
    }*/
];

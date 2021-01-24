import React, { CSSProperties, ReactElement, useMemo } from "react";
import { plugins } from "@webiny/plugins";
import {
    PbRenderElementStylePlugin,
    PbRenderElementAttributesPlugin,
    PbElement,
    PbShallowElement
} from "@webiny/app-page-builder/types";

type CombineClassNamesType = (...styles) => string;
const combineClassNames: CombineClassNamesType = (...styles) => {
    return styles.filter(s => s !== "" && s !== "css-0").join(" ");
};

type ElementRootChildrenFunctionParamsType = {
    getAllClasses: (...classes: string[]) => string;
    combineClassNames: (...classes: string[]) => string;
    elementStyle: CSSProperties;
    elementAttributes: { [key: string]: string };
    customClasses: string[];
};
type ElementRootChildrenFunction = (params: ElementRootChildrenFunctionParamsType) => ReactElement;

type ElementRootProps = {
    element: PbElement | PbShallowElement;
    style?: CSSProperties;
    className?: string;
    children?: ReactElement | ReactElement[] | ElementRootChildrenFunction;
};

const ElementRootComponent: React.FunctionComponent<ElementRootProps> = ({
    element,
    style,
    children,
    className = null
}) => {
    const shallowElement = useMemo(
        () => ({
            id: element ? element.id : null,
            type: element ? element.type : null,
            data: element ? element.data : null,
            elements: []
        }),
        [element.id]
    );

    const finalStyle = useMemo(() => {
        const stylePlugins = plugins.byType<PbRenderElementStylePlugin>(
            "pb-render-page-element-style"
        );
        // Reduce style
        return stylePlugins.reduce((accumulatedStyles, plugin) => {
            return plugin.renderStyle({ element: shallowElement, style: accumulatedStyles });
        }, style || {});
    }, [style, element.id]);

    const attributes = useMemo(() => {
        const attributePlugins = plugins.byType<PbRenderElementAttributesPlugin>(
            "pb-render-page-element-attributes"
        );
        return attributePlugins.reduce((accumulatedAttributes, plugin) => {
            return plugin.renderAttributes({
                element: shallowElement,
                attributes: accumulatedAttributes
            });
        }, {});
    }, [element.id]);

    // required due to re-rendering when set content atom and still nothing in elements atom
    if (!element) {
        return null;
    }

    const classNames = element.data.settings?.className || "";

    const getAllClasses = (...extraClasses) => {
        return [className, ...extraClasses, ...classNames.split(" ")]
            .filter(v => v && v !== "css-0")
            .join(" ");
    };

    if (typeof children === "function") {
        return children({
            getAllClasses,
            combineClassNames,
            elementStyle: finalStyle,
            elementAttributes: attributes,
            customClasses: classNames.split(" ")
        });
    }

    return (
        <div className={getAllClasses()} style={finalStyle} {...attributes}>
            {children}
        </div>
    );
};

export const ElementRoot = React.memo(ElementRootComponent);

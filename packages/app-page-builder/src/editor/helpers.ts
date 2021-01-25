import { DragObjectWithTypeWithTargetType } from "@webiny/app-page-builder/editor/components/Droppable";
import invariant from "invariant";
import shortid from "shortid";
import { set } from "dot-prop-immutable";
import { plugins } from "@webiny/plugins";
import {
    PbEditorBlockPlugin,
    PbEditorPageElementPlugin,
    PbEditorPageElementSettingsPlugin,
    PbElement,
    PbShallowElement,
    PbEditorPageElementStyleSettingsPlugin
} from "@webiny/app-page-builder/types";

const updateElementsPaths = (elements: PbElement[], parentPath: string): PbElement[] => {
    return elements.map((element, index) => {
        const path = `${parentPath}.${index}`;
        const id = element.id || shortid.generate();
        return updateElementPaths({
            ...element,
            id,
            path
        });
    });
};
const updateElementPaths = (element: PbElement): PbElement => {
    const { id = shortid.generate(), path = "0", type, data } = element;
    return {
        ...element,
        id,
        path,
        type,
        data,
        elements: updateElementsPaths(element.elements, path)
    };
};

export const updateChildPathsHelper = (element: PbElement): PbElement => {
    return updateElementPaths(element);
};

type FlattenElementsType = {
    [id: string]: PbShallowElement;
};
export const flattenElementsHelper = (el): FlattenElementsType => {
    const els = {};
    els[el.id] = set(
        el,
        "elements",
        (el.elements || []).map(child => {
            const children = flattenElementsHelper(child);
            Object.keys(children).forEach(id => {
                els[id] = children[id];
            });
            return child.id;
        })
    );

    return els;
};

export const saveElementToContentHelper = (
    content: PbElement,
    path: string,
    element: PbElement
): PbElement => {
    const paths = path.split(".").map(Number);
    paths.shift();
    const elements = set(content.elements, paths.join(".elements."), element);
    return set(content, "elements", elements);
};

const findElementByPath = (elements: PbElement[], paths: number[]): PbElement => {
    if (paths.length === 0) {
        throw new Error("There are no paths sent.");
    }
    const path = paths.shift();
    if (paths.length === 0) {
        return elements[path];
    } else if (!elements[path]) {
        return undefined;
    }
    return findElementByPath(elements[path].elements, paths);
};

export const extrapolateContentElementHelper = (
    content: PbElement,
    path: string
): PbElement | undefined => {
    const paths = path.split(".").map(Number);
    // always remove the first one because that is the content
    paths.shift();
    if (paths.length === 0) {
        return content;
    }
    return findElementByPath(content.elements, paths);
};

export const removeElementHelper = (parent: PbElement, id: string): PbElement => {
    return {
        ...parent,
        elements: parent.elements.filter(target => target.id !== id)
    };
};

export const cloneElementHelper = (target: PbElement): PbElement => {
    return {
        ...target,
        id: undefined,
        path: undefined,
        elements: target.elements.map(cloneElementHelper)
    };
};

type CreateElementHelperType = (
    type: string,
    options?: { [key: string]: any },
    parent?: PbElement
) => PbElement;

export const createElementHelper: CreateElementHelperType = (type, options = {}, parent) => {
    const plugin = plugins
        .byType<PbEditorPageElementPlugin>("pb-editor-page-element")
        .find(pl => pl.elementType === type);

    invariant(plugin, `Missing element plugin for type "${type}"!`);

    return {
        id: shortid.generate(),
        data: {
            settings: {}
        },
        elements: [],
        path: undefined,
        type,
        ...plugin.create(options, parent)
    };
};

export const addElementToParentHelper = (
    element: PbElement,
    parent: PbElement,
    position?: number
) => {
    if (position === undefined || position === null) {
        return updateChildPathsHelper({
            ...parent,
            elements: parent.elements.concat([element])
        });
    }

    return updateChildPathsHelper({
        ...parent,
        elements: [
            ...parent.elements.slice(0, position),
            element,
            ...parent.elements.slice(position)
        ]
    });
};

export const createDroppedElementHelper = (
    source: DragObjectWithTypeWithTargetType,
    target: PbElement
): { element: PbElement; dispatchCreateElementAction?: boolean } => {
    if (source.path) {
        return {
            element: cloneElementHelper({
                id: source.id,
                path: source.path,
                type: source.type as string,
                elements: (source as any).elements || [],
                data: (source as any).data || {}
            })
        };
    }
    return {
        element: createElementHelper(source.type, {}, target),
        dispatchCreateElementAction: true
    };
};

export const createBlockElementsHelper = (name: string) => {
    const plugin = plugins.byName<PbEditorBlockPlugin>(name);

    invariant(plugin, `Missing block plugin "${name}"!`);

    return {
        id: shortid.generate(),
        data: {},
        elements: [],
        path: "",
        ...plugin.create()
    };
};

export const userElementSettingsPluginsHelper = (elementType: string) => {
    return plugins
        .byType<PbEditorPageElementSettingsPlugin>("pb-editor-page-element-settings")
        .filter(pl => {
            if (typeof pl.elements === "boolean") {
                return pl.elements === true;
            }
            if (Array.isArray(pl.elements)) {
                return pl.elements.includes(elementType);
            }

            return false;
        })
        .map(pl => pl.name);
};

export const userElementStyleSettingsPluginsHelper = (elementType: string) => {
    return plugins
        .byType<PbEditorPageElementStyleSettingsPlugin>("pb-editor-page-element-style-settings")
        .filter(pl => {
            if (typeof pl.elements === "boolean") {
                return pl.elements === true;
            }
            if (Array.isArray(pl.elements)) {
                return pl.elements.includes(elementType);
            }

            return false;
        })
        .map(pl => pl.name);
};

type CreateEmptyElementHelperCallableType = (
    args: Pick<PbElement, "id" | "path" | "type">
) => PbElement;
export const createEmptyElementHelper: CreateEmptyElementHelperCallableType = ({
    id,
    path,
    type
}) => {
    return {
        id,
        path,
        type,
        data: {
            settings: {}
        },
        elements: []
    };
};

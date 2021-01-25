import { SaveRevisionActionEvent } from "@webiny/app-page-builder/editor/recoil/actions";
import { UpdateElementActionArgsType } from "./types";
import { EventActionCallableType } from "@webiny/app-page-builder/editor/recoil/eventActions";
import { PbElement } from "@webiny/app-page-builder/types";
import lodashMerge from "lodash/merge";
import { ContentAtomType } from "@webiny/app-page-builder/editor/recoil/modules";
import {
    extrapolateContentElementHelper,
    flattenElementsHelper,
    saveElementToContentHelper,
    updateChildPathsHelper
} from "@webiny/app-page-builder/editor/helpers";

const createElementWithoutElementsAsString = (element: PbElement): PbElement => {
    if (!element.elements || typeof element.elements[0] !== "string") {
        return element;
    }
    return {
        ...element,
        elements: []
    };
};
const cloneAndMergeContentState = (
    content: ContentAtomType,
    element: PbElement,
    merge: boolean
) => {
    const newContent = updateChildPathsHelper(createElementWithoutElementsAsString(element));
    if (!merge) {
        return newContent;
    }
    return lodashMerge(content, newContent);
};

const buildNewPageContentState = (content: ContentAtomType, element: PbElement, merge: boolean) => {
    const newElement = updateChildPathsHelper(createElementWithoutElementsAsString(element));
    const existingElement = extrapolateContentElementHelper(content, element.path);
    if (merge) {
        return saveElementToContentHelper(
            content,
            element.path,
            lodashMerge({}, existingElement, newElement)
        );
    }
    return saveElementToContentHelper(content, element.path, newElement);
};
const createContentState = (content: ContentAtomType, element: PbElement, merge: boolean) => {
    if (element.type === "document") {
        return cloneAndMergeContentState(content, element, merge);
    }
    return buildNewPageContentState(content, element, merge);
};

export const updateElementAction: EventActionCallableType<UpdateElementActionArgsType> = (
    state,
    { client },
    { element, merge, history }
) => {
    const content = createContentState(state.content, element, merge);
    const actions = [];
    if (history === true) {
        if (!client) {
            throw new Error(
                "You cannot save revision while updating if you do not pass client arg."
            );
        }
        actions.push(new SaveRevisionActionEvent());
    }

    const flattenedContent = flattenElementsHelper(content);

    return {
        state: {
            content,
            elements: flattenedContent
        },
        actions
    };
};

import React from "react";
import { useEventActionHandler } from "@webiny/app-page-builder/editor/hooks/useEventActionHandler";
import {
    activeElementAtom,
    elementByIdSelector
} from "@webiny/app-page-builder/editor/recoil/modules";
import { plugins } from "@webiny/plugins";
import { PbEditorPageElementPlugin, PbElement } from "@webiny/app-page-builder/types";
import { useRecoilValue } from "recoil";
import { CloneElementActionEvent } from "@webiny/app-page-builder/editor/recoil/actions/cloneElement";

type CloneActionPropsType = {
    children: React.ReactElement;
};
const CloneAction: React.FunctionComponent<CloneActionPropsType> = ({ children }) => {
    const eventActionHandler = useEventActionHandler();
    const activeElementId = useRecoilValue(activeElementAtom);
    const element: PbElement = useRecoilValue(elementByIdSelector(activeElementId));

    if (!element) {
        return null;
    }
    const onClick = () => {
        eventActionHandler.trigger(
            new CloneElementActionEvent({
                element
            })
        );
    };

    const plugin = plugins
        .byType<PbEditorPageElementPlugin>("pb-editor-page-element")
        .find(pl => pl.elementType === element.type);

    if (!plugin) {
        return null;
    }

    return React.cloneElement(children, { onClick });
};
export default React.memo(CloneAction);

import React, { useEffect } from "react";
import HTML5Backend from "react-dnd-html5-backend";
import classSet from "classnames";
import { useEventActionHandler } from "../../hooks/useEventActionHandler";
import { EventActionHandler, PbEditorEventActionPlugin } from "../../../types";
import {
    rootElementAtom,
    PageAtomType,
    revisionsAtom,
    RevisionsAtomType,
    uiAtom
} from "../../recoil/modules";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { DndProvider } from "react-dnd";
import { useKeyHandler } from "../../hooks/useKeyHandler";
import { plugins } from "@webiny/plugins";
import "./Editor.scss";
// Components
import EditorBar from "./Bar";
import EditorToolbar from "./Toolbar";
import EditorContent from "./Content";
import DragPreview from "./DragPreview";
import Dialogs from "./Dialogs";
import EditorSideBar from "./EditorSideBar";

type PluginRegistryType = Map<string, () => void>;

const registerPlugins = (handler: EventActionHandler): PluginRegistryType => {
    const registry = new Map();
    const editorEventActionPlugins = plugins.byType<PbEditorEventActionPlugin>(
        "pb-editor-event-action-plugin"
    );
    for (const pl of editorEventActionPlugins) {
        if (!pl.name) {
            throw new Error(
                `All plugins with type "pb-editor-event-action-plugin" must have a name.`
            );
        }
        registry.set(pl.name, pl.onEditorMount(handler));
    }
    return registry;
};
const unregisterPlugins = (handler: EventActionHandler, registered: PluginRegistryType): void => {
    for (const name of registered.keys()) {
        const cb = registered.get(name);
        const pl = plugins.byName<PbEditorEventActionPlugin>(name);
        if (typeof pl.onEditorUnmount === "function") {
            pl.onEditorUnmount(handler, cb);
            continue;
        }
        cb();
    }
};

const triggerActionButtonClick = (name: string): void => {
    const id = `#action-${name}`;
    const element = document.querySelector<HTMLElement | null>(id);
    if (!element) {
        console.warn(`There is no html element "${id}"`);
        return;
    }
    element.click();
};

type EditorPropsType = {
    page: PageAtomType;
    revisions: RevisionsAtomType;
};
export const Editor: React.FunctionComponent<EditorPropsType> = ({ revisions }) => {
    const eventActionHandler = useEventActionHandler();
    const { addKeyHandler, removeKeyHandler } = useKeyHandler();
    const { isDragging, isResizing } = useRecoilValue(uiAtom);

    const setRevisionsAtomValue = useSetRecoilState(revisionsAtom);
    const rootElementId = useRecoilValue(rootElementAtom);

    const firstRender = React.useRef<boolean>(true);
    const registeredPlugins = React.useRef<PluginRegistryType>();

    useEffect(() => {
        addKeyHandler("mod+z", e => {
            e.preventDefault();
            triggerActionButtonClick("undo");
        });
        addKeyHandler("mod+shift+z", e => {
            e.preventDefault();
            triggerActionButtonClick("redo");
        });
        registeredPlugins.current = registerPlugins(eventActionHandler);

        setRevisionsAtomValue(revisions);
        return () => {
            removeKeyHandler("mod+z");
            removeKeyHandler("mod+shift+z");

            unregisterPlugins(eventActionHandler, registeredPlugins.current);
        };
    }, []);

    useEffect(() => {
        if (!rootElementId || firstRender.current === true) {
            firstRender.current = false;
            return;
        }
    }, [rootElementId]);

    const classes = {
        "pb-editor": true,
        "pb-editor-dragging": isDragging,
        "pb-editor-resizing": isResizing
    };
    return (
        <DndProvider backend={HTML5Backend}>
            <div className={classSet(classes)}>
                <EditorBar />
                <EditorToolbar />
                <EditorContent />
                <EditorSideBar />
                <Dialogs />
                <DragPreview />
            </div>
        </DndProvider>
    );
};

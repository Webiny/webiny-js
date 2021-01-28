import React, { useCallback, useEffect, useState, useMemo } from "react";
import * as Styled from "./StyledComponents";
import { activePluginParamsByNameSelector } from "@webiny/app-page-builder/editor/recoil/modules";
import { useEventActionHandler } from "@webiny/app-page-builder/editor/hooks/useEventActionHandler";
import {
    DeactivatePluginActionEvent,
    DragEndActionEvent,
    DragStartActionEvent,
    DropElementActionEvent
} from "@webiny/app-page-builder/editor/recoil/actions";
import { DropElementActionArgsType } from "@webiny/app-page-builder/editor/recoil/actions/dropElement/types";
import Draggable from "@webiny/app-page-builder/editor/components/Draggable";
import { plugins } from "@webiny/plugins";
import { usePageBuilder } from "@webiny/app-page-builder/hooks/usePageBuilder";
import { useRecoilValue } from "recoil";
import { css } from "emotion";
import { List, ListItem, ListItemMeta } from "@webiny/ui/List";
import { Icon } from "@webiny/ui/Icon";
import { Typography } from "@webiny/ui/Typography";
import { ButtonFloating } from "@webiny/ui/Button";
import { ReactComponent as AddIcon } from "@webiny/app-page-builder/editor/assets/icons/add.svg";
import {
    PbEditorPageElementGroupPlugin,
    PbEditorPageElementPlugin
} from "@webiny/app-page-builder/types";
import { useKeyHandler } from "../../../hooks/useKeyHandler";

const ADD_ELEMENT = "pb-editor-toolbar-add-element";

// @ts-ignore
const categoriesList = css({
    backgroundColor: "var(--mdc-theme-surface)",
    boxShadow: "inset 1px 0px 5px 0px var(--mdc-theme-background)",
    borderTop: "1px solid var(--mdc-theme-background)",
    ".mdc-list-item": {
        width: 150,
        fontWeight: "600 !important",
        borderBottom: "1px solid var(--mdc-theme-background)",
        "&.active": {
            backgroundColor: "var(--mdc-theme-background)",
            color: "var(--mdc-theme-primary)",
            ".mdc-list-item__meta": {
                color: "var(--mdc-theme-primary)"
            }
        }
    }
});

const AddElement: React.FunctionComponent = () => {
    const handler = useEventActionHandler();
    const plugin = useRecoilValue(activePluginParamsByNameSelector(ADD_ELEMENT));
    const { params } = plugin || {};
    const { removeKeyHandler, addKeyHandler } = useKeyHandler();

    const dragStart = useCallback(() => {
        handler.trigger(new DragStartActionEvent());
    }, []);
    const dragEnd = useCallback(() => {
        handler.trigger(new DragEndActionEvent());
    }, []);
    const deactivatePlugin = useCallback(() => {
        handler.trigger(
            new DeactivatePluginActionEvent({
                name: ADD_ELEMENT
            })
        );
    }, []);
    const dropElement = useCallback((args: DropElementActionArgsType) => {
        handler.trigger(new DropElementActionEvent(args));
    }, []);
    const getGroups = useCallback(() => {
        return plugins.byType<PbEditorPageElementGroupPlugin>("pb-editor-page-element-group");
    }, []);

    const getGroupElements = useCallback(group => {
        return plugins
            .byType<PbEditorPageElementPlugin>("pb-editor-page-element")
            .filter(el => el.toolbar && el.toolbar.group === group);
    }, []);

    const [group, setGroup] = useState<string>(getGroups()[0].name);

    const { theme } = usePageBuilder();

    const refresh = useCallback(() => {
        setGroup(group);
    }, []);

    const enableDragOverlay = useCallback(() => {
        const el = document.querySelector(".pb-editor");
        if (!el) {
            return;
        }
        el.classList.add("pb-editor-dragging");
    }, []);

    const disableDragOverlay = useCallback(() => {
        const el = document.querySelector(".pb-editor");
        if (!el) {
            return;
        }
        el.classList.remove("pb-editor-dragging");
    }, []);

    const renderDraggable = useCallback((element, plugin) => {
        const { elementType } = plugin;

        return (
            <Draggable
                enabled={true}
                key={plugin.name}
                target={plugin.target}
                beginDrag={props => {
                    dragStart();
                    setTimeout(deactivatePlugin, 20);
                    return { type: elementType, target: props.target };
                }}
                endDrag={() => {
                    dragEnd();
                }}
            >
                {({ drag }) => (
                    <div ref={drag}>{renderOverlay(element, null, "Drag to Add", plugin)}</div>
                )}
            </Draggable>
        );
    }, []);

    const renderOverlay = useCallback(
        (element, onClick = null, label, plugin) => {
            return (
                <Styled.ElementPreview>
                    <Styled.Overlay>
                        <Styled.Backdrop className={"backdrop"} />
                        <Styled.AddBlock className={"add-block"}>
                            <ButtonFloating
                                data-testid={`pb-editor-add-element-button-${plugin.elementType}`}
                                onClick={onClick}
                                label={label}
                                icon={<AddIcon />}
                                onMouseDown={enableDragOverlay}
                                onMouseUp={disableDragOverlay}
                            />
                        </Styled.AddBlock>
                    </Styled.Overlay>
                    {element}
                </Styled.ElementPreview>
            );
        },
        [enableDragOverlay, disableDragOverlay]
    );

    const renderClickable = useCallback(
        (element, plugin) => {
            const item = renderOverlay(
                element,
                () => {
                    dropElement({
                        source: { type: plugin.elementType } as any,
                        target: { ...params }
                    });
                    deactivatePlugin();
                },
                "Click to Add",
                plugin
            );

            return React.cloneElement(item, { key: plugin.name });
        },
        [params, deactivatePlugin, dropElement, renderOverlay]
    );

    useEffect(() => {
        addKeyHandler("escape", e => {
            e.preventDefault();
            deactivatePlugin();
        });

        return () => removeKeyHandler("escape");
    });

    const emptyViewContent = useMemo(() => {
        const { group: selectedGroup } = getGroups().find(pl => pl.name === group);
        return selectedGroup.emptyView;
    }, [group]);

    const groupElements = group ? getGroupElements(group) : [];

    return (
        <Styled.Flex>
            <List className={categoriesList}>
                {getGroups().map(plugin => (
                    <ListItem
                        onClick={() => setGroup(plugin.name)}
                        key={plugin.name}
                        className={plugin.name === group && "active"}
                    >
                        {plugin.group.title}

                        {plugin.group.icon && (
                            <ListItemMeta>
                                <Icon icon={plugin.group.icon} />
                            </ListItemMeta>
                        )}
                    </ListItem>
                ))}
            </List>
            <Styled.Elements>
                {groupElements.length
                    ? groupElements.map(plugin => {
                          return (params ? renderClickable : renderDraggable)(
                              <div data-role="draggable">
                                  <Styled.ElementBox>
                                      <Styled.ElementTitle>
                                          {typeof plugin.toolbar.title === "function" ? (
                                              plugin.toolbar.title({ refresh })
                                          ) : (
                                              <Typography use="overline">
                                                  {plugin.toolbar.title}
                                              </Typography>
                                          )}
                                      </Styled.ElementTitle>
                                      <Styled.ElementPreviewCanvas>
                                          {plugin.toolbar.preview({ theme })}
                                      </Styled.ElementPreviewCanvas>
                                  </Styled.ElementBox>
                              </div>,
                              plugin
                          );
                      })
                    : emptyViewContent}
            </Styled.Elements>
        </Styled.Flex>
    );
};

export default React.memo(AddElement);

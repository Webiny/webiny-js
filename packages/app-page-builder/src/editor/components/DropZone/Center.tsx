import { activeElementAtom } from "@webiny/app-page-builder/editor/recoil/modules";
import React from "react";
import Droppable, { DroppableIsVisiblePropType, DroppableOnDropPropType } from "./../Droppable";
import styled from "@emotion/styled";
import { useRecoilValue } from "recoil";

type ContainerProps = {
    isOver: boolean;
    highlight: boolean;
    children: React.ReactNode;
};

const Container = React.memo<ContainerProps>(
    styled("div")(({ isOver }: ContainerProps) => ({
        backgroundColor: "transparent",
        boxSizing: "border-box",
        height: "100%",
        minHeight: 100,
        position: "relative",
        userSelect: "none",
        width: "100%",
        border: isOver
            ? "1px dashed var(--mdc-theme-primary)"
            : "1px dashed var(--mdc-theme-secondary)",
        ".addIcon": {
            color: isOver
                ? "var(--mdc-theme-primary) !important"
                : "var(--mdc-theme-secondary) !important"
        }
    }))
);

const Add = styled("div")({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    margin: 0
});

const isVisible: DroppableIsVisiblePropType = () => true;

type Props = {
    id: string;
    type: string;
    onDrop: DroppableOnDropPropType;
    children: React.ReactNode;
    isHighlighted: boolean;
};

const Center: React.FunctionComponent<Props> = ({ id, type, onDrop, children, isHighlighted }) => {
    const activeElementId = useRecoilValue(activeElementAtom);
    const isActive = activeElementId === id;
    return (
        <Droppable onDrop={onDrop} type={type} isVisible={isVisible}>
            {({ isOver, isDroppable, drop }) => (
                <div style={{ width: "100%", height: "100%" }} ref={drop}>
                    <Container
                        isOver={(isOver && isDroppable) || isActive}
                        highlight={isHighlighted}
                    >
                        <Add>{children}</Add>
                    </Container>
                </div>
            )}
        </Droppable>
    );
};

export default React.memo(Center);

import { DragStartActionArgsType, DragEndActionArgsType } from "./types";
import { BaseEventAction } from "../../eventActions";

export class DragStartActionEvent extends BaseEventAction<DragStartActionArgsType> {
    public getName(): string {
        return "DragStartActionEvent";
    }
}
export class DragEndActionEvent extends BaseEventAction<DragEndActionArgsType> {
    public getName(): string {
        return "DragEndActionEvent";
    }
}

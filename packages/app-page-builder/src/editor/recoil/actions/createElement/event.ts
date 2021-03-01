import { BaseEventAction } from "../../eventActions";
import { CreateElementEventActionArgsType } from "./types";

export class CreateElementActionEvent extends BaseEventAction<CreateElementEventActionArgsType> {
    public getName(): string {
        return "CreateElementActionEvent";
    }
}

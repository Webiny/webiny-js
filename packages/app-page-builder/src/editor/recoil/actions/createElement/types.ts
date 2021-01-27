import { EventActionCallable, PbElement } from "@webiny/app-page-builder/types";

export type CreateElementEventActionArgsType = {
    element: PbElement;
    source: PbElement;
};
export type CreateElementEventActionCallable = EventActionCallable<
    CreateElementEventActionArgsType
>;

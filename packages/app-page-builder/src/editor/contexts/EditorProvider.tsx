import React, { createContext } from "react";
import { EventActionHandlerProvider } from "./EventActionHandlerProvider";

const EditorContext = createContext(null);

export const EditorProvider: React.FunctionComponent<any> = props => {
    return (
        <EventActionHandlerProvider>
            <EditorContext.Provider {...props}>{props.children}</EditorContext.Provider>
        </EventActionHandlerProvider>
    );
};

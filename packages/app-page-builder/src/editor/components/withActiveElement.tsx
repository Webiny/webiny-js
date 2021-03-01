import React from "react";
import { activeElementAtom, elementByIdSelector } from "../recoil/modules";
import { useRecoilValue } from "recoil";

export function withActiveElement() {
    return function decorator(Component: React.ComponentType<any>) {
        return function ActiveElementComponent(props: any) {
            const activeElementId = useRecoilValue(activeElementAtom);
            const element = useRecoilValue(elementByIdSelector(activeElementId));
            return <Component {...props} element={element} />;
        };
    };
}

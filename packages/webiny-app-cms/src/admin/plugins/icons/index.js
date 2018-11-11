// @flow
import * as React from "react";
import { library } from "@fortawesome/fontawesome-svg-core";
import type { PluginType } from "webiny-app/types";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { fas } from "@fortawesome/free-solid-svg-icons";

const createSvg = (icon: Object) => {
    return `<svg width="24" viewBox="0 0 ${icon[0]} ${icon[1]}">
            <path d="${icon[4]}" fill="currentColor" />
        </svg>`;
};

const icons = [];

export default ({
    name: "cms-icons-fontawesome",
    type: "cms-icons",
    init() {
        library.add(fab, fas);

        Object.keys(library.definitions).forEach(pack => {
            const defs = library.definitions[pack];
            Object.keys(defs).forEach(icon => {
                icons.push({
                    name: icon,
                    id: pack + "-" + icon,
                    svg: createSvg(defs[icon])
                });
            });
        });
    },
    getIcons() {
        return icons;
    }
}: PluginType);

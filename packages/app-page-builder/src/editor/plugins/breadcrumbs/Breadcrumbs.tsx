import React from "react";
import { css } from "emotion";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { PbShallowElement } from "../../../types";
import { extrapolateContentElementHelper } from "../../helpers";
import {
    activeElementAtom,
    contentAtom,
    ContentAtomType,
    elementByIdSelector,
    highlightElementAtom
} from "../../recoil/modules";
import { COLORS } from "../elementSettings/components/StyledComponents";

const breadcrumbs = css({
    display: "flex",
    zIndex: 20,
    flexDirection: "row",
    padding: 0,
    position: "fixed",
    left: 55,
    bottom: 0,
    width: "calc(100% - 55px)",
    backgroundColor: "var(--mdc-theme-surface)",
    borderTop: "1px solid var(--mdc-theme-background)",
    fontSize: "12px",
    overflow: "hidden",
    "> li": {
        cursor: "pointer",
        display: "flex",
        "& .element": {
            color: COLORS.darkestGray,
            textDecoration: "none",
            textTransform: "capitalize",
            padding: "10px 0 10px 45px",
            background: "hsla(300, 2%, calc(92% - var(--element-count) * 1%), 1)",
            position: "relative",
            display: "block"
        },
        "& .element::after": {
            content: '" "',
            display: "block",
            width: "0",
            height: "0",
            borderTop: "50px solid transparent",
            borderBottom: "50px solid transparent",
            borderLeft: "30px solid hsla(300, 2%, calc(92% - var(--element-count) * 1%), 1)   ",
            position: "absolute",
            top: "50%",
            marginTop: "-50px",
            left: "100%",
            zIndex: 2
        },
        "& .element::before": {
            content: '" "',
            display: "block",
            width: "0",
            height: "0",
            borderTop: "50px solid transparent",
            borderBottom: "50px solid transparent",
            borderLeft: "30px solid hsla(0, 0%, 100%, 1)",
            position: "absolute",
            top: "50%",
            marginTop: "-50px",
            marginLeft: "1px",
            left: "100%",
            zIndex: 1
        }
    },
    "& li:first-child .element": { paddingLeft: "10px" },

    // Handle active state
    "& li .element:hover": {
        color: "var(--mdc-theme-surface)",
        background: "var(--mdc-theme-secondary)"
    },
    "& li .element:hover:after": {
        color: "var(--mdc-theme-surface)",
        borderLeftColor: "var(--mdc-theme-secondary) !important"
    }
});

const createBreadcrumbs = (content: ContentAtomType, element: PbShallowElement) => {
    const path = element.path;
    const list = [
        {
            id: element.id,
            type: element.type
        }
    ];
    const paths = path.split(".");
    paths.pop();
    while (paths.length > 0) {
        const el = extrapolateContentElementHelper(content, paths.join("."));
        if (!el) {
            return list.reverse();
        }
        list.push({
            id: el.id,
            type: el.type
        });
        paths.pop();
    }
    return list.reverse();
};

const Breadcrumbs: React.FunctionComponent = () => {
    const [activeElement, setActiveElementAtomValue] = useRecoilState(activeElementAtom);
    const setHighlightElementValue = useSetRecoilState(highlightElementAtom);
    const element = useRecoilValue(elementByIdSelector(activeElement));
    const contentAtomValue = useRecoilValue(contentAtom);
    if (!element) {
        return null;
    }
    const highlightElement = (id: string) => {
        setHighlightElementValue(id);
    };
    const activateElement = (id: string) => {
        setActiveElementAtomValue(id);
    };

    const breadcrumbsList = createBreadcrumbs(contentAtomValue, element);
    breadcrumbsList.shift();

    return (
        <ul className={breadcrumbs}>
            {breadcrumbsList.map(({ id, type }, index) => (
                <li
                    key={id}
                    onMouseOver={() => highlightElement(id)}
                    onClick={() => activateElement(id)}
                >
                    <span
                        className={"element"}
                        style={{ "--element-count": index } as React.CSSProperties}
                    >
                        {type}
                    </span>
                </li>
            ))}
        </ul>
    );
};
export default React.memo(Breadcrumbs);

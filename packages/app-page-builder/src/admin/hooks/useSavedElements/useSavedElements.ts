import { useState } from "react";
import { useQuery } from "@apollo/react-hooks";
import { get } from "dot-prop-immutable";
import { LIST_PAGE_ELEMENTS } from "../../graphql/pages";
import createElementPlugin from "../../utils/createElementPlugin";
import createBlockPlugin from "../../utils/createBlockPlugin";

export const useSavedElements = () => {
    const [ready, setReady] = useState(false);

    const { data, loading } = useQuery(LIST_PAGE_ELEMENTS, { skip: ready });

    if (ready) {
        return true;
    }

    if (loading) {
        return false;
    }

    const elements = get(data, "pageBuilder.listPageElements.data") || [];
    if (!ready) {
        elements.forEach(el => {
            if (el.type === "element") {
                createElementPlugin(el);
            } else {
                createBlockPlugin(el);
            }
        });
        setReady(true);
    }

    return ready;
};

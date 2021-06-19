import gql from "graphql-tag";
import lodashIsEqual from "lodash/isEqual";
import lodashDebounce from "lodash/debounce";
import { SaveRevisionActionArgsType } from "./types";
import { ToggleSaveRevisionStateActionEvent } from "./event";
import { EventActionCallable } from "~/types";
import { PageAtomType } from "../../modules";

type PageRevisionType = Pick<PageAtomType, "title" | "snippet" | "path" | "settings"> & {
    category: string;
    content: any;
};

let lastSavedRevisionData: any = {};

const isDataEqualToLastSavedData = (data: PageRevisionType) => {
    return lodashIsEqual(data, lastSavedRevisionData);
};

const triggerOnFinish = (
    onFinish?: SaveRevisionActionArgsType["onFinish"],
    payload = null
): void => {
    if (!onFinish || typeof onFinish !== "function") {
        return;
    }
    onFinish(payload);
};

let debouncedSave = null;

export const saveRevisionAction: EventActionCallable<SaveRevisionActionArgsType> = async (
    state,
    meta,
    args = {}
) => {
    if (state.page.locked) {
        return {};
    }

    const data: PageRevisionType = {
        title: state.page.title,
        snippet: state.page.snippet,
        path: state.page.path,
        settings: state.page.settings,
        content: await state.getElementTree(),
        category: state.page.category.slug
    };

    if (isDataEqualToLastSavedData(data)) {
        triggerOnFinish(args.onFinish);
        return {};
    }

    lastSavedRevisionData = data;

    const updatePage = gql`
        mutation PbUpdatePage($id: ID!, $data: PbUpdatePageInput!) {
            pageBuilder {
                updatePage(id: $id, data: $data) {
                    data {
                        id
                        content
                        title
                        status
                        savedOn
                    }
                    error {
                        code
                        message
                        data
                    }
                }
            }
        }
    `;

    if (debouncedSave) {
        debouncedSave.cancel();
    }

    const runSave = async () => {
        meta.eventActionHandler.trigger(new ToggleSaveRevisionStateActionEvent({ saving: true }));

        const response = await meta.client.mutate({
            mutation: updatePage,
            variables: {
                id: state.page.id,
                data
            }
        });

        meta.eventActionHandler.trigger(new ToggleSaveRevisionStateActionEvent({ saving: false }));
        triggerOnFinish(args.onFinish, { data: response.data.pageBuilder.updatePage.data });
    };

    if (args && args.debounce === false) {
        runSave();
    } else {
        debouncedSave = lodashDebounce(runSave, 2000);
        debouncedSave();
    }

    return {};
};

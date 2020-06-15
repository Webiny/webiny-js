import * as React from "react";
import { useRouter } from "@webiny/react-router";
import { useSnackbar } from "@webiny/app-admin/hooks/useSnackbar";
// Components
import EditorBar from "./Bar";
import EditorContent from "./EditorContent";
import DragPreview from "./DragPreview";
import { useContentModelEditor } from "./Context";

import { i18n } from "@webiny/app/i18n";
const t = i18n.ns("app-headless-cms/admin/editor");

const ContentModelEditor = () => {
    const {
        getContentModel,
        state: { data, id }
    } = useContentModelEditor();

    const { history } = useRouter();
    const { showSnackbar } = useSnackbar();

    React.useEffect(() => {
        getContentModel(id).catch(() => {
            history.push(`/cms/content-models`);
            showSnackbar(t`Could not load content model with given ID.`);
        });
    }, [id]);

    if (!data) {
        return null;
    }

    return (
        <div className={"content-model-editor"}>
            <EditorBar />
            <EditorContent />
            <DragPreview />
        </div>
    );
};

export default ContentModelEditor;

import React from "react";
import { css } from "emotion";
import { Elevation } from "@webiny/ui/Elevation";
import { i18n } from "@webiny/app/i18n";
import { CmsEditorContentTab } from "../../../../../../types";
import { useContentModelEditor } from "../../Context";
import { ContentModelForm } from "../../../ContentModelForm";

const t = i18n.ns("app-headless-cms/admin/components/editor/tabs/preview");

const formPreviewWrapper = css({
    padding: 40,
    margin: 40,
    boxSizing: "border-box"
});

const style = {
    noFieldsMessage: css({
        textAlign: "center"
    })
};

export const PreviewTab: CmsEditorContentTab = ({ activeTab }) => {
    const { data } = useContentModelEditor();

    const { fields } = data;

    return (
        <Elevation z={1} className={formPreviewWrapper}>
            {fields && fields.length && activeTab ? (
                <ContentModelForm contentModel={data} />
            ) : (
                <div className={style.noFieldsMessage}>
                    {t`Before previewing the form, please add at least one field to the content model.`}
                </div>
            )}
        </Elevation>
    );
};

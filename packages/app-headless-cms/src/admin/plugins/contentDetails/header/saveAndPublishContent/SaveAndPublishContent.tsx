import React, { useCallback, useMemo } from "react";
import { i18n } from "@webiny/app/i18n";
import { ButtonDefault } from "@webiny/ui/Button";
import { useSnackbar } from "@webiny/app-admin/hooks/useSnackbar";
import { createPublishMutation } from "@webiny/app-headless-cms/admin/components/ContentModelForm/graphql";
import { useMutation } from "@webiny/app-headless-cms/admin/hooks";
import { get } from "lodash";
import { useConfirmationDialog } from "@webiny/app-admin/hooks/useConfirmationDialog";
import { css } from "emotion";
const t = i18n.ns("app-headless-cms/admin/plugins/content-details/header/publish-revision");

const buttonStyles = css({
    marginLeft: 16
});

const SaveAndPublishButton = ({
    content,
    contentModel,
    getLoading,
    setLoading,
    revisionsList,
    state
}) => {
    const { showSnackbar } = useSnackbar();

    const { PUBLISH_CONTENT } = useMemo(() => {
        return {
            PUBLISH_CONTENT: createPublishMutation(contentModel)
        };
    }, [contentModel.modelId]);

    const [publishContentMutation] = useMutation(PUBLISH_CONTENT);

    const onPublish = useCallback(async () => {
        setLoading(true);
        const response = await publishContentMutation({
            variables: { revision: content.id }
        });

        const contentData = get(response, "data.content");
        setLoading(false);
        if (contentData.error) {
            return showSnackbar(contentData.error.message);
        }

        showSnackbar(t`Content published successfully.`);
        revisionsList.refetch();
    }, [content.id]);

    const { showConfirmation } = useConfirmationDialog({
        title: t`Publish content`,
        message: (
            <p>{t`You are about to publish a new revision. Are you sure you want to continue?`}</p>
        )
    });
    return (
        <ButtonDefault
            className={buttonStyles}
            onClick={() => {
                state.contentForm.submit();
                showConfirmation(onPublish);
            }}
            disabled={!content.id || getLoading()}
        >
            {t`Save & Publish`}
        </ButtonDefault>
    );
};

export default SaveAndPublishButton;

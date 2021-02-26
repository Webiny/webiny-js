import React, { useCallback } from "react";
import { useApolloClient } from "@apollo/react-hooks";
import { useRouter } from "@webiny/react-router";
import { useSnackbar } from "@webiny/app-admin/hooks/useSnackbar";
import { useConfirmationDialog } from "@webiny/app-admin/hooks/useConfirmationDialog";
import { useDialog } from "@webiny/app-admin/hooks/useDialog";
import { IconButton } from "@webiny/ui/Button";
import { Tooltip } from "@webiny/ui/Tooltip";
import { ReactComponent as DeleteIcon } from "../../../../assets/delete.svg";
import { DELETE_PAGE, LIST_PAGES } from "../../../../graphql/pages";
import { i18n } from "@webiny/app/i18n";
import cloneDeep from "lodash/cloneDeep";
import usePermission from "../../../../../hooks/usePermission";

const t = i18n.ns("app-headless-cms/app-page-builder/page-details/header/delete-page");

const DeletePage = props => {
    const { page } = props;
    const client = useApolloClient();
    const { showSnackbar } = useSnackbar();
    const { history } = useRouter();
    const { showDialog } = useDialog();
    const { canDelete } = usePermission();

    const { showConfirmation } = useConfirmationDialog({
        title: t`Delete page`,
        message: (
            <p>
                {t`You are about to delete the entire page and all of its revisions!`}
                <br />
                {t`Are you sure you want to permanently delete the page {title}?`({
                    title: <strong>{page.title}</strong>
                })}
            </p>
        )
    });

    const confirmDelete = useCallback(
        () =>
            showConfirmation(async () => {
                const [uniquePageId] = page.id.split("#");
                const id = `${uniquePageId}#0001`;
                const { data: res } = await client.mutate({
                    mutation: DELETE_PAGE,
                    variables: { id },
                    update(cache, response) {
                        if (response.data.pageBuilder.deletePage.error) {
                            return;
                        }

                        let variables;

                        try {
                            variables = JSON.parse(
                                localStorage.getItem("wby_pb_pages_list_latest_variables")
                            );
                        } catch {}

                        if (!variables) {
                            return;
                        }

                        const data = cloneDeep(
                            cache.readQuery<Record<string, any>>({ query: LIST_PAGES, variables })
                        );

                        data.pageBuilder.listPages.data = data.pageBuilder.listPages.data.filter(
                            item => item.id !== page.id
                        );

                        cache.writeQuery({
                            query: LIST_PAGES,
                            variables,
                            data
                        });
                    }
                });

                const { error } = res?.pageBuilder?.deletePage;
                if (error) {
                    return showDialog(error.message, { title: t`Could not delete page.` });
                }

                showSnackbar(
                    <span>
                        {t`The page {title} was deleted successfully.`({
                            title: (
                                <strong>
                                    {page.title.substr(0, 20)}
                                    ...
                                </strong>
                            )
                        })}
                    </span>
                );

                history.push("/page-builder/pages");
            }),
        [page.id]
    );

    if (!canDelete(page)) {
        return null;
    }

    return (
        <Tooltip content={"Delete"} placement={"top"}>
            <IconButton icon={<DeleteIcon />} onClick={confirmDelete} />
        </Tooltip>
    );
};

export default DeletePage;

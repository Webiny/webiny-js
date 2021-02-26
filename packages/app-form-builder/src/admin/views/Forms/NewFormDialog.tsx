import React from "react";
import { css } from "emotion";
import { useRouter } from "@webiny/react-router";
import { useMutation } from "@apollo/react-hooks";
import { Form } from "@webiny/form";
import { Input } from "@webiny/ui/Input";
import { CREATE_FORM } from "../../graphql";
import { useSnackbar } from "@webiny/app-admin/hooks/useSnackbar";
import { CircularProgress } from "@webiny/ui/Progress";

import { i18n } from "@webiny/app/i18n";
const t = i18n.namespace("Forms.NewFormDialog");

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogOnClose
} from "@webiny/ui/Dialog";
import { ButtonDefault } from "@webiny/ui/Button";
import { addFormToListCache } from "../cache";

const narrowDialog = css({
    ".mdc-dialog__surface": {
        width: 400,
        minWidth: 400
    }
});

export type NewFormDialogProps = {
    open: boolean;
    onClose: DialogOnClose;
};

const NewFormDialog: React.FC<NewFormDialogProps> = ({ open, onClose }) => {
    const [loading, setLoading] = React.useState(false);
    const { showSnackbar } = useSnackbar();
    const { history } = useRouter();

    const [create] = useMutation(CREATE_FORM);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            className={narrowDialog}
            data-testid="fb-new-form-modal"
        >
            <Form
                onSubmit={async formData => {
                    setLoading(true);

                    await create({
                        variables: formData,
                        update(cache, { data }) {
                            const { data: revision, error } = data.formBuilder.form;

                            if (error) {
                                setLoading(false);
                                return showSnackbar(error.message);
                            }

                            addFormToListCache(cache, revision);

                            history.push(`/form-builder/forms/${encodeURIComponent(revision.id)}`);
                        }
                    });
                }}
            >
                {({ Bind, submit }) => (
                    <>
                        {loading && <CircularProgress label={"Creating form..."} />}
                        <DialogTitle>{t`New form`}</DialogTitle>
                        <DialogContent>
                            <Bind name={"name"}>
                                <Input placeholder={"Enter a name for your new form"} />
                            </Bind>
                        </DialogContent>
                        <DialogActions>
                            <ButtonDefault onClick={submit}>+ {t`Create`}</ButtonDefault>
                        </DialogActions>
                    </>
                )}
            </Form>
        </Dialog>
    );
};

export default NewFormDialog;

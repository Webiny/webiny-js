import * as React from "react";
import { css } from "emotion";
import { Form } from "../../../../components/Form";
import { DATA_FIELDS } from "../../../../components/Form/graphql";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import { FbFormModel, FbRevisionModel } from "../../../../types";
import CircularProgress from "@webiny/ui/Progress/CircularProgress";

const GET_FORM = gql`
    query FbGetForm($revision: ID!) {
        formBuilder {
            getForm(revision: $revision) {
                data {
                    ${DATA_FIELDS}
                }
                error {
                    message
                }
            }
        }
    }
`;

const pageInnerWrapper = css({
    overflowY: "scroll",
    overflowX: "hidden",
    maxHeight: "calc(100vh - 290px)",
    position: "relative",
    padding: 25,
    backgroundColor: "var(--webiny-theme-color-surface, #fff) !important"
});

type FormPreviewProps = {
    revision: FbRevisionModel;
    form: FbFormModel;
};

const FormPreview = ({ revision }: FormPreviewProps) => {
    const { data, loading } = useQuery(GET_FORM, {
        variables: {
            revision: revision.id
        }
    });

    if (loading) {
        return <CircularProgress />;
    }

    return (
        <div className={pageInnerWrapper}>
            {revision && <Form preview data={data?.formBuilder?.getForm?.data} />}
        </div>
    );
};

export default FormPreview;

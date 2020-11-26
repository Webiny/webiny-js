import React from "react";
import { useQuery } from "react-apollo";
import { renderPlugins } from "@webiny/app/plugins";
import { useRouter } from "@webiny/react-router";
import styled from "@emotion/styled";
import { Elevation } from "@webiny/ui/Elevation";
import { GET_FORM } from "@webiny/app-form-builder/admin/viewsGraphql";
import { useSnackbar } from "@webiny/app-admin/hooks/useSnackbar";
import { Tabs } from "@webiny/ui/Tabs";

const EmptySelect = styled("div")({
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--mdc-theme-on-surface)",
    ".select-form": {
        maxWidth: 400,
        padding: "50px 100px",
        textAlign: "center",
        display: "block",
        borderRadius: 2,
        backgroundColor: "var(--mdc-theme-surface)"
    }
});

const DetailsContainer = styled("div")({
    height: "calc(100% - 10px)",
    overflow: "hidden",
    position: "relative",
    nav: {
        backgroundColor: "var(--mdc-theme-surface)"
    }
});

const EmptyFormDetails = () => {
    return (
        <EmptySelect>
            <Elevation z={2} className={"select-form"}>
                Select a form on the left side, or click the green button to create a new one.
            </Elevation>
        </EmptySelect>
    );
};

export type FormDetailsProps = {
    refreshForms: () => void;
};

const FormDetails = ({ refreshForms }: FormDetailsProps) => {
    const { location, history } = useRouter();
    const { showSnackbar } = useSnackbar();
    const query = new URLSearchParams(location.search + location.hash);
    const formId = query.get("id");

    if (!formId) {
        return <EmptyFormDetails />;
    }

    const { data, loading } = useQuery(GET_FORM, {
        variables: {
            id: formId
        },
        onCompleted: data => {
            const error = data?.formBuilder?.form?.error?.message;
            if (error) {
                query.delete("id");
                history.push({ search: query.toString() });
                showSnackbar(error);
            }
        }
    });

    const form = data?.formBuilder?.form?.data || null;

    return (
        <DetailsContainer>
            {form && (
                <Tabs>
                    {renderPlugins(
                        "forms-form-details-revision-content",
                        { refreshForms, form, loading },
                        { wrapper: false }
                    )}
                </Tabs>
            )}
        </DetailsContainer>
    );
};

export default FormDetails;

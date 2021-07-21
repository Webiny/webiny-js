import React, { Fragment } from "react";
import styled from "@emotion/styled";
import { Form } from "@webiny/form";
import { Input } from "@webiny/ui/Input";
import { Grid, Cell } from "@webiny/ui/Grid";
import { CircularProgress } from "@webiny/ui/Progress";
import { Accordion, AccordionItem } from "@webiny/ui/Accordion";
import { ButtonDefault, ButtonPrimary, ButtonIcon } from "@webiny/ui/Button";
import { validation } from "@webiny/validation";
import {
    SimpleForm,
    SimpleFormHeader,
    SimpleFormFooter,
    SimpleFormContent
} from "@webiny/app-admin/components/SimpleForm";
import EmptyView from "@webiny/app-admin/components/EmptyView";
import { ReactComponent as AddIcon } from "@webiny/app-admin/assets/icons/add-18px.svg";
import GroupAutocomplete from "../Components/GroupAutocomplete";
import AvatarImage from "./../Components/AvatarImage";
import { ReactComponent as SettingsIcon } from "../../assets/icons/settings-24px.svg";
import { ReactComponent as SecurityIcon } from "../../assets/icons/security-24px.svg";
import { useUserForm } from "~/views/Users/hooks/useUserForm";

const AvatarWrapper = styled("div")({
    margin: "24px 100px 32px"
});

const FormWrapper = styled("div")({
    margin: "0 100px"
});

const ButtonWrapper = styled("div")({
    display: "flex",
    justifyContent: "space-between"
});

const UsersForm = () => {
    const {
        login,
        fullName,
        showEmptyView,
        createUser,
        cancelEditing,
        user,
        loading,
        onSubmit
    } = useUserForm();

    if (showEmptyView) {
        return (
            <EmptyView
                title={"Click on the left side list to display user details or create a..."}
                action={
                    <ButtonDefault data-testid="new-record-button" onClick={createUser}>
                        <ButtonIcon icon={<AddIcon />} /> {"New User"}
                    </ButtonDefault>
                }
            />
        );
    }

    return (
        <Form data={user} onSubmit={onSubmit}>
            {({ data, form, Bind }) => (
                <Fragment>
                    <AvatarWrapper>
                        <Bind name="avatar">
                            <AvatarImage round />
                        </Bind>
                    </AvatarWrapper>
                    <FormWrapper>
                        <SimpleForm>
                            {loading && <CircularProgress />}
                            <SimpleFormHeader title={fullName || "New User"} />
                            <SimpleFormContent>
                                <Accordion elevation={0}>
                                    <AccordionItem
                                        description="Account information"
                                        title="Bio"
                                        icon={<SettingsIcon />}
                                        open
                                    >
                                        <Grid>
                                            <Cell span={12}>
                                                <Bind
                                                    name="firstName"
                                                    validators={validation.create("required")}
                                                >
                                                    <Input label={"First Name"} />
                                                </Bind>
                                            </Cell>
                                            <Cell span={12}>
                                                <Bind
                                                    name="lastName"
                                                    validators={validation.create("required")}
                                                >
                                                    <Input label={"Last name"} />
                                                </Bind>
                                            </Cell>
                                            <Cell span={12}>
                                                <Bind
                                                    name="login"
                                                    beforeChange={(value: string, cb) =>
                                                        cb(value.toLowerCase())
                                                    }
                                                    validators={validation.create("required,email")}
                                                >
                                                    <Input
                                                        label={"Email"}
                                                        disabled={Boolean(login)}
                                                    />
                                                </Bind>
                                            </Cell>
                                        </Grid>
                                    </AccordionItem>
                                    <AccordionItem
                                        description="Assign to security group"
                                        title="Group"
                                        icon={<SecurityIcon />}
                                        open
                                    >
                                        <Cell span={12} style={{ marginBottom: "8px" }}>
                                            <Bind
                                                name="group"
                                                validators={validation.create("required")}
                                            >
                                                <GroupAutocomplete label={"Group"} />
                                            </Bind>
                                        </Cell>
                                    </AccordionItem>
                                </Accordion>
                            </SimpleFormContent>
                            <SimpleFormFooter>
                                <ButtonWrapper>
                                    <ButtonDefault onClick={cancelEditing}>
                                        {"Cancel"}
                                    </ButtonDefault>
                                    <ButtonPrimary onClick={form.submit}>
                                        {"Save user"}
                                    </ButtonPrimary>
                                </ButtonWrapper>
                            </SimpleFormFooter>
                        </SimpleForm>
                    </FormWrapper>
                </Fragment>
            )}
        </Form>
    );
};

export default UsersForm;

import * as React from "react";
import { Form } from "@webiny/form";
import { validation } from "@webiny/validation";
import { ButtonPrimary } from "@webiny/ui/src/Button";
import { Input } from "@webiny/ui/src/Input";
import { Grid, Cell } from "@webiny/ui/src/Grid";
import { Typography } from "@webiny/ui/src/Typography";
import { Elevation } from "@webiny/ui/src/Elevation";
import { Alert } from "@webiny/ui/src/Alert";
import { CircularProgress } from "@webiny/ui/src/Progress";
import StateContainer from "./StateContainer";
import { alignRight, alignCenter, InnerContent, Title, errorMessage } from "./StyledComponents";
import { SignInChildrenProps } from "@webiny/app-plugin-security-cognito/types";

const SignIn: React.FC<SignInChildrenProps> = ({ signIn, error, loading, authProps }) => {
    return (
        <StateContainer>
            <Form onSubmit={signIn} submitOnEnter>
                {({ Bind, submit }) => (
                    <Elevation z={2}>
                        <InnerContent>
                            {loading && <CircularProgress />}
                            <Title>
                                <h1>
                                    <Typography use="headline4">Sign In</Typography>
                                </h1>
                            </Title>

                            {authProps.message && (
                                <Grid>
                                    <Cell span={12}>
                                        <Alert
                                            title={authProps.message.title}
                                            type={authProps.message.type}
                                        >
                                            {authProps.message.text}
                                        </Alert>
                                    </Cell>
                                </Grid>
                            )}

                            {error && (
                                <Grid>
                                    <Cell span={12} className={errorMessage}>
                                        <Alert title="Authentication error" type={"danger"}>
                                            {error.message}
                                        </Alert>
                                    </Cell>
                                </Grid>
                            )}

                            <Grid>
                                <Cell span={12}>
                                    <Bind
                                        name="username"
                                        validators={validation.create("required,email")}
                                        beforeChange={(val, cb) => cb(val.toLowerCase())}
                                    >
                                        <Input label={"Your e-mail"} outlined={true} />
                                    </Bind>
                                </Cell>
                                <Cell span={12}>
                                    <Bind
                                        name="password"
                                        validators={validation.create("required,password")}
                                    >
                                        <Input
                                            type={"password"}
                                            label={"Your password"}
                                            outlined={true}
                                        />
                                    </Bind>
                                </Cell>
                                <Cell span={12} className={alignRight}>
                                    <ButtonPrimary onClick={submit}>
                                        {"Submit"}
                                    </ButtonPrimary>
                                </Cell>
                                <Cell span={12} className={alignCenter}>
                                    <a
                                        href="#"
                                        onClick={() => authProps.changeState("forgotPassword")}
                                    >
                                        Forgot password?
                                    </a>
                                </Cell>
                            </Grid>
                        </InnerContent>
                    </Elevation>
                )}
            </Form>
        </StateContainer>
    );
};

export default SignIn;

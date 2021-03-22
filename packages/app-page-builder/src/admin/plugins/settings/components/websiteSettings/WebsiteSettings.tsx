import * as React from "react";
import { Form } from "@webiny/form";
import { Grid, Cell } from "@webiny/ui/Grid";
import { Input } from "@webiny/ui/Input";
import { ButtonIcon, ButtonPrimary } from "@webiny/ui/Button";
import SingleImageUpload from "@webiny/app-admin/components/SingleImageUpload";
import { PagesAutocomplete } from "../../../../components/PagesAutocomplete";
import { useQuery, useMutation } from "@apollo/react-hooks";
import { useSnackbar } from "@webiny/app-admin/hooks/useSnackbar";
import { GET_SETTINGS, UPDATE_SETTINGS } from "./graphql";
import { CircularProgress } from "@webiny/ui/Progress";
import { get, set } from "lodash";
import { validation } from "@webiny/validation";
import { sendEvent, setProperties } from "@webiny/tracking/react";
import { ReactComponent as EditIcon } from "../../../../assets/edit.svg";
import { useRouter } from "@webiny/react-router";

import {
    SimpleForm,
    SimpleFormFooter,
    SimpleFormContent,
    SimpleFormHeader
} from "@webiny/app-admin/components/SimpleForm";
import { GET_SETTINGS as SETTINGS_QUERY } from "../../../../hooks/usePageBuilderSettings";
import { useCallback } from "react";

import { css } from "emotion";

const style = {
    moveTrailingIcon: css({
        ".rmwc-icon": {
            top: "11px !important"
        }
    })
};

const WebsiteSettings = () => {
    const { showSnackbar } = useSnackbar();
    const { history } = useRouter();

    const { data, loading: queryInProgress } = useQuery(GET_SETTINGS);
    const settings = get(data, "pageBuilder.getSettings.data") || {};

    const defaultSettings = get(data, "pageBuilder.getDefaultSettings.data");
    const websiteUrl = get(defaultSettings, "websiteUrl");
    const websitePreviewUrl = get(defaultSettings, "websitePreviewUrl");

    const [update, { loading: mutationInProgress }] = useMutation(UPDATE_SETTINGS, {
        update: (cache, { data }) => {
            const dataFromCache = cache.readQuery<Record<string, any>>({ query: SETTINGS_QUERY });
            const updatedSettings = get(data, "pageBuilder.updateSettings.data");

            if (updatedSettings) {
                cache.writeQuery({
                    query: SETTINGS_QUERY,
                    data: set(dataFromCache, "pageBuilder.getSettings.data", updatedSettings)
                });
            }
        }
    });

    const editPage = useCallback(id => {
        console.log("[WEBSITE]");
        history.push(`/page-builder/editor/${id}`);
    }, []);

    return (
        <Form
            data={settings}
            onSubmit={async data => {
                data.websiteUrl = (data.websiteUrl || "").replace(/\/+$/g, "");

                if (
                    settings.websiteUrl !== data.websiteUrl &&
                    !data.websiteUrl.includes("localhost")
                ) {
                    sendEvent("custom-domain", {
                        domain: data.websiteUrl
                    });
                    setProperties({
                        domain: data.websiteUrl
                    });
                }

                delete data.id;
                await update({ variables: { data } });
                showSnackbar("Settings updated successfully.");
            }}
        >
            {({ Bind, form, data }) => (
                <SimpleForm>
                    {(queryInProgress || mutationInProgress) && <CircularProgress />}
                    <SimpleFormHeader title={`General`} />
                    <SimpleFormContent>
                        <Grid>
                            <Cell span={12}>
                                <Bind name={"name"} validators={validation.create("required")}>
                                    <Input label="Website name" />
                                </Bind>
                            </Cell>
                            <Cell span={6}>
                                <Bind name={"websiteUrl"} validators={validation.create("url")}>
                                    <Input
                                        label="Website URL"
                                        description={
                                            <>
                                                The URL on which your app is available.{" "}
                                                {websiteUrl && (
                                                    <>
                                                        If not specified, the default one (
                                                        <a href={websiteUrl} target={"blank"}>
                                                            {websiteUrl}
                                                        </a>
                                                        ) will be used.
                                                    </>
                                                )}
                                            </>
                                        }
                                    />
                                </Bind>
                            </Cell>
                            <Cell span={6}>
                                <Bind
                                    name={"websitePreviewUrl"}
                                    validators={validation.create("url")}
                                >
                                    <Input
                                        label="Website preview URL"
                                        description={
                                            <>
                                                The preview URL on which your app is available.{" "}
                                                {websitePreviewUrl && (
                                                    <>
                                                        If not specified, the default one (
                                                        <a
                                                            href={websitePreviewUrl}
                                                            target={"blank"}
                                                        >
                                                            {websitePreviewUrl}
                                                        </a>
                                                        ) will be used.
                                                    </>
                                                )}
                                            </>
                                        }
                                    />
                                </Bind>
                            </Cell>

                            <Cell span={12} />
                            <Cell span={6}>
                                <Grid>
                                    <Cell span={12}>
                                        <SimpleFormHeader title={"Default pages"} />
                                    </Cell>
                                    <Cell span={12}>
                                        <Bind name={"pages.home"}>
                                            <PagesAutocomplete
                                                className={style.moveTrailingIcon}
                                                label={"Homepage"}
                                                description={`To set a different page, start typing its title and select it from the dropdown menu. Note that the page must be published in order to appear.`}
                                                trailingIcon={
                                                    <ButtonPrimary
                                                        small
                                                        onClick={() => editPage(data.pages.home)}
                                                    >
                                                        <ButtonIcon icon={<EditIcon />} />
                                                        Edit
                                                    </ButtonPrimary>
                                                }
                                            />
                                        </Bind>
                                    </Cell>
                                    <Cell span={12}>
                                        <Bind name={"pages.notFound"}>
                                            <PagesAutocomplete
                                                className={style.moveTrailingIcon}
                                                label={"Not found (404) page"}
                                                description={`To set a different page, start typing its title and select it from the dropdown menu. Note that the page must be published in order to appear.`}
                                                trailingIcon={
                                                    <ButtonPrimary
                                                        small
                                                        onClick={() =>
                                                            editPage(data.pages.notFound)
                                                        }
                                                    >
                                                        <ButtonIcon icon={<EditIcon />} />
                                                        Edit
                                                    </ButtonPrimary>
                                                }
                                            />
                                        </Bind>
                                    </Cell>
                                </Grid>
                            </Cell>
                            <Cell span={6}>
                                <Grid>
                                    <Cell span={12}>
                                        <SimpleFormHeader title={`Favicon and logo`} />
                                    </Cell>
                                    <Cell span={6}>
                                        <Bind name={"favicon"}>
                                            <SingleImageUpload
                                                onChangePick={["id", "src"]}
                                                label="Favicon"
                                                accept={[
                                                    "image/png",
                                                    "image/x-icon",
                                                    "image/vnd.microsoft.icon"
                                                ]}
                                                description={
                                                    <span>
                                                        Supported file types: <strong>.png</strong>{" "}
                                                        and <strong>.ico</strong> .
                                                    </span>
                                                }
                                            />
                                        </Bind>
                                    </Cell>
                                    <Cell span={6}>
                                        <Bind name={"logo"}>
                                            <SingleImageUpload
                                                label="Logo"
                                                onChangePick={["id", "src"]}
                                            />
                                        </Bind>
                                    </Cell>
                                </Grid>
                            </Cell>
                        </Grid>
                    </SimpleFormContent>

                    <SimpleFormHeader title="Social Media" />
                    <SimpleFormContent>
                        <Grid>
                            <Cell span={6}>
                                <Grid>
                                    <Cell span={12}>
                                        <Bind
                                            name={"social.facebook"}
                                            validators={validation.create("url")}
                                        >
                                            <Input label="Facebook" />
                                        </Bind>
                                    </Cell>
                                    <Cell span={12}>
                                        <Bind
                                            name={"social.twitter"}
                                            validators={validation.create("url")}
                                        >
                                            <Input label="Twitter" />
                                        </Bind>
                                    </Cell>
                                    <Cell span={12}>
                                        <Bind
                                            name={"social.instagram"}
                                            validators={validation.create("url")}
                                        >
                                            <Input label="Instagram" />
                                        </Bind>
                                    </Cell>
                                </Grid>
                            </Cell>

                            <Cell span={6}>
                                <Grid>
                                    <Cell span={12}>
                                        <Bind name={"social.image"}>
                                            <SingleImageUpload
                                                onChangePick={["id", "src"]}
                                                label="Default Open Graph image"
                                                description={`The default OG image for all pages. Recommended resolution 1596x545.`}
                                                // TODO: @adrian
                                                // imageEditor={{
                                                //     crop: {
                                                //         autoEnable: true,
                                                //         aspectRatio: 1596 / 545
                                                //     }
                                                // }}
                                            />
                                        </Bind>
                                    </Cell>
                                </Grid>
                            </Cell>
                        </Grid>
                    </SimpleFormContent>

                    <SimpleFormFooter>
                        <ButtonPrimary onClick={form.submit}>Save</ButtonPrimary>
                    </SimpleFormFooter>
                </SimpleForm>
            )}
        </Form>
    );
};

export default WebsiteSettings;

import React, { useMemo } from "react";
import { Grid, Cell } from "@webiny/ui/Grid";
import { Select } from "@webiny/ui/Select";
import { get } from "lodash";
import { Input } from "@webiny/ui/Input";
import { plugins } from "@webiny/plugins";
import { FbFormLayoutPlugin } from "../../../../../types";
import { PbThemePlugin } from "@webiny/app-page-builder/types";
import { RichTextEditor, createPropsFromConfig } from "@webiny/app-admin/components/RichTextEditor";

const GeneralSettings = ({ Bind }) => {
    const theme = useMemo(
        () => Object.assign({}, ...plugins.byType("pb-theme").map((pl: PbThemePlugin) => pl.theme)),
        []
    );

    const layouts = useMemo(
        () =>
            [
                ...(get(theme, "formBuilder.layouts") || []),
                ...plugins.byType<FbFormLayoutPlugin>("form-layout").map(pl => pl.layout)
            ].reduce((acc, item) => {
                if (!acc.find(l => l.name === item.name)) {
                    acc.push(item);
                }
                return acc;
            }, []),
        []
    );

    const rteProps = useMemo(() => {
        return createPropsFromConfig(plugins.byType("fb-rte-config").map(pl => pl.config));
    }, []);

    return (
        <React.Fragment>
            <Grid>
                <Cell span={12}>
                    <Bind name={"successMessage"}>
                        <RichTextEditor {...rteProps} label={"Success message"} />
                    </Bind>
                </Cell>
                <Cell span={12}>
                    <Bind name={"submitButtonLabel"}>
                        <Input label={"Submit button label"} />
                    </Bind>
                </Cell>
                <Cell span={12}>
                    <Bind name={"layout.renderer"}>
                        <Select
                            label={"Layout"}
                            options={layouts.map(item => {
                                return { value: item.name, label: item.title };
                            })}
                        />
                    </Bind>
                </Cell>
            </Grid>
        </React.Fragment>
    );
};

export default GeneralSettings;

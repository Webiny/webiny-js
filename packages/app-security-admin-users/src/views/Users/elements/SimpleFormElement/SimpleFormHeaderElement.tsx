import React from "react";
import { css } from "emotion";
import { Cell, Grid } from "@webiny/ui/Grid";
import { Typography } from "@webiny/ui/Typography";
import { Element, ElementConfig } from "@webiny/ui-composer/Element";
import { Icon } from "@webiny/ui/Icon";
import { SimpleFormElementRenderProps } from "~/views/Users/elements/SimpleFormElement";

const iconClass = css({
    marginRight: 15,
    color: "var(--mdc-theme-text-primary-on-background)"
});

const headerClass = css({
    borderBottom: "1px solid var(--mdc-theme-on-background)",
    color: "var(--mdc-theme-text-primary-on-background)"
});

const titleClass = css({
    display: "flex",
    alignItems: "center"
});

const actionsClass = css({
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center"
});

interface SimpleFormHeaderConfig extends ElementConfig {
    getTitle(props: SimpleFormElementRenderProps): string;
    icon?: React.ReactElement;
}

export class SimpleFormHeaderElement extends Element<SimpleFormHeaderConfig> {
    constructor(id, config: SimpleFormHeaderConfig) {
        super(id, config);

        this.toggleGrid(false);
    }

    setIcon(icon: React.ReactElement) {
        this.config.icon = icon;
    }

    render(props: any): any {
        const { icon, getTitle } = this.config;

        return (
            <Grid className={headerClass}>
                <Cell span={6} className={titleClass}>
                    <React.Fragment>
                        {icon && <Icon className={iconClass} icon={icon} />}
                        <Typography use="headline5">{getTitle(props)}</Typography>
                    </React.Fragment>
                </Cell>
                <Cell span={6} className={actionsClass}>
                    {super.render(props)}
                </Cell>
            </Grid>
        );
    }
}

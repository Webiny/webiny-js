import React from "react";
import { AdminDrawerFooterMenuPlugin } from "../../types";
import { ListItem, ListItemGraphic } from "@webiny/ui/List";
import { Icon } from "@webiny/ui/Icon";
import { ReactComponent as GithubIcon } from "../../assets/icons/github-brands.svg";

import { i18n } from "@webiny/app/i18n";
const t = i18n.ns("app-admin/navigation");

export default (): AdminDrawerFooterMenuPlugin => ({
    type: "admin-drawer-footer-menu",
    name: "admin-drawer-footer-menu-source",
    render() {
        return (
            <a href="https://github.com/webiny/webiny-js" rel="noopener noreferrer" target="_blank">
                <ListItem ripple={false}>
                    <ListItemGraphic>
                        <Icon icon={<GithubIcon />} />
                    </ListItemGraphic>
                    {t`Source`}
                </ListItem>
            </a>
        );
    }
});

import * as React from "react";
import { Route } from "@webiny/react-router";
import { AdminLayout } from "@webiny/app-admin/components/AdminLayout";
import PrerenderingSettings from "./components/prerenderingSettings/PrerenderingSettings";
import WebsiteSettings from "./components/websiteSettings/WebsiteSettings";
import { SecureRoute, SecureView } from "@webiny/app-security/components";
import { i18n } from "@webiny/app/i18n";
import { plugins } from "@webiny/plugins";
import Helmet from "react-helmet";
import { PbMenuSettingsItemPlugin } from "../../../types";
import { RoutePlugin } from "@webiny/app/types";
import { AdminMenuSettingsPlugin } from "@webiny/app-admin/types";

const t = i18n.ns("app-page-builder/admin/menus");

const allPlugins = [
    {
        type: "route",
        name: "route-settings-website",
        route: (
            <Route
                path="/settings/page-builder/website"
                render={() => (
                    <AdminLayout>
                        <Helmet title={t`Page Builder - Website Settings`} />
                        <SecureRoute permission={"pb.settings"}>
                            <WebsiteSettings />
                        </SecureRoute>
                    </AdminLayout>
                )}
            />
        )
    } as RoutePlugin,
    {
        type: "route",
        name: "route-settings-prerendering",
        route: (
            <Route
                path="/settings/page-builder/prerendering"
                render={() => (
                    <AdminLayout>
                        <Helmet title={t`Page Builder - Prerendering Settings`} />
                        <SecureRoute permission={"pb.settings"}>
                            <PrerenderingSettings />
                        </SecureRoute>
                    </AdminLayout>
                )}
            />
        )
    } as RoutePlugin,
    {
        type: "admin-menu-settings",
        name: "menu-settings-page-builder",
        render({ Section, Item }) {
            return (
                <SecureView permission={"pb.settings"}>
                    <Section label={t`Page Builder`}>
                        {plugins
                            .byType<PbMenuSettingsItemPlugin>("menu-settings-page-builder")
                            .map(plugin => (
                                <React.Fragment key={plugin.name + new Date()}>
                                    {plugin.render({ Item })}
                                </React.Fragment>
                            ))}
                    </Section>
                </SecureView>
            );
        }
    } as AdminMenuSettingsPlugin,
    {
        type: "menu-settings-page-builder",
        name: "menu-settings-general",
        render({ Item }) {
            return <Item label={t`Website`} path={"/settings/page-builder/website"} />;
        }
    } as PbMenuSettingsItemPlugin,
    {
        type: "menu-settings-page-builder",
        name: "menu-settings-prerendering",
        render({ Item }) {
            return <Item label={t`Prerendering`} path={"/settings/page-builder/prerendering"} />;
        }
    } as PbMenuSettingsItemPlugin
];

export default allPlugins;

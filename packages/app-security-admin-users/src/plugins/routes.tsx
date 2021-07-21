import React from "react";
import Helmet from "react-helmet";
import { Route } from "@webiny/react-router";
import { AdminLayout } from "@webiny/app-admin/components/AdminLayout";
import { SecureRoute } from "@webiny/app-security/components";
import { RoutePlugin } from "@webiny/app/types";
import { Groups } from "../views/Groups";
import { ApiKeys } from "../views/ApiKeys";
import { Account } from "../views/Account";
import { Permission } from "./constants";
import { ViewComponent } from "@webiny/ui-composer/View";
import { UsersView } from "~/views/Users/UsersView";

const plugins: RoutePlugin[] = [
    {
        name: "route-security-groups",
        type: "route",
        route: (
            <Route
                exact
                path={"/security/groups"}
                render={() => (
                    <SecureRoute permission={Permission.Groups}>
                        <AdminLayout>
                            <Helmet title={"Security - Groups"} />
                            <Groups />
                        </AdminLayout>
                    </SecureRoute>
                )}
            />
        )
    },
    {
        name: "route-security-users",
        type: "route",
        route: (
            <Route
                exact
                path={"/security/users"}
                render={() => (
                    <SecureRoute permission={Permission.Users}>
                        <ViewComponent view={new UsersView()} />
                    </SecureRoute>
                )}
            />
        )
    },
    {
        name: "route-security-api-keys",
        type: "route",
        route: (
            <Route
                exact
                path={"/security/api-keys"}
                render={() => (
                    <SecureRoute permission={Permission.ApiKeys}>
                        <AdminLayout>
                            <Helmet title={"Security - API Keys"} />
                            <ApiKeys />
                        </AdminLayout>
                    </SecureRoute>
                )}
            />
        )
    },
    {
        name: "route-security-account",
        type: "route",
        route: (
            <Route
                exact
                path={"/account"}
                render={() => (
                    <AdminLayout>
                        <Helmet title={"User Account"} />
                        <Account />
                    </AdminLayout>
                )}
            />
        )
    }
];

export default plugins;

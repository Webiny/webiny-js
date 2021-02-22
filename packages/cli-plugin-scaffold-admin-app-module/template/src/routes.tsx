import React, { Suspense, lazy } from "react";
import Helmet from "react-helmet";
import { Route } from "@webiny/react-router";
import { RoutePlugin } from "@webiny/app/types";
import { CircularProgress } from "@webiny/ui/Progress";
import { AdminLayout } from "@webiny/app-admin/components/AdminLayout";

const Loader = ({ children, ...props }) => (
    <Suspense fallback={<CircularProgress />}>{React.cloneElement(children, props)}</Suspense>
);

const Targets = lazy(() => import("./views/Targets"));

const entitiesRoute: RoutePlugin = {
    type: "route",
    name: "route-admin-entities",
    route: (
        <Route
            path={"/entities"}
            exact
            render={() => (
                <AdminLayout>
                    <Helmet>
                        <title>Targets</title>
                    </Helmet>
                    <Loader>
                        <Targets />
                    </Loader>
                </AdminLayout>
            )}
        />
    )
};

const routes: RoutePlugin[] = [entitiesRoute];

export default routes;

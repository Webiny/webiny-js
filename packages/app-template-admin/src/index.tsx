import React from "react";
import { createTemplate } from "@webiny/app-template";
import { ApolloProvider } from "react-apollo";
import Helmet from "react-helmet";

// App structure imports
import { UiProvider } from "@webiny/app/contexts/Ui";
import { I18NProvider } from "@webiny/app-i18n/contexts/I18N";
import { SecurityProvider } from "@webiny/app-security/contexts/Security";
import { CircularProgress } from "@webiny/ui/Progress";
import { AppInstaller } from "@webiny/app-admin/components/Install/AppInstaller";
import { ThemeProvider } from "@webiny/app-admin/contexts/Theme";

// Other plugins
import { fileUploadPlugin, imagePlugin } from "@webiny/app/plugins";
import adminPlugins from "@webiny/app-admin/plugins";
import i18nPlugins from "@webiny/app-i18n/admin/plugins";
import securityPlugins from "@webiny/app-security/admin/plugins";
import cognito from "@webiny/app-plugin-security-cognito";
import cognitoTheme from "@webiny/app-plugin-security-cognito-theme/admin";

// ApolloClient
import { createApolloClient } from "./apolloClient";
import { NetworkError } from "./apolloClient/NetworkError";

// Router
import { BrowserRouter, Route, Redirect } from "@webiny/react-router";

<<<<<<< HEAD
=======
import { AdminLayout } from "@webiny/app-admin/components/AdminLayout";
import Welcome from "./Welcome";
>>>>>>> feat: ✨  Add welcome message to users on account creation

export type AdminAppOptions = {
    welcomeScreen?: boolean;
    cognito: {
        region: string;
        userPoolId: string;
        userPoolWebClientId: string;
    };
    defaultRoute?: string;
    plugins?: any[];
};

export default createTemplate<AdminAppOptions>(opts => {
    const appStructure = [
        {
            type: "app-template-renderer",
            name: "app-template-renderer-apollo",
            render(children) {
                return (
                    <ApolloProvider client={createApolloClient()}>
                        <NetworkError>{children}</NetworkError>
                    </ApolloProvider>
                );
            }
        },
        {
            type: "app-template-renderer",
            name: "app-template-renderer-router",
            render(children) {
                return (
                    <BrowserRouter basename={process.env.PUBLIC_URL}>
                        {children}
                        <Route
                            exact
                            path="/"
                            render={() => <Redirect to={opts.defaultRoute || "/"} />}
                        />
                    </BrowserRouter>
                );
            }
        },
        {
            type: "app-template-renderer",
            name: "app-template-renderer-ui",
            render(children) {
                return <UiProvider>{children}</UiProvider>;
            }
        },
        {
            type: "app-template-renderer",
            name: "app-template-renderer-i18n",
            render(children) {
                return (
                    <I18NProvider loader={<CircularProgress label={"Loading locales..."} />}>
                        {children}
                    </I18NProvider>
                );
            }
        },
        {
            type: "app-template-renderer",
            name: "app-template-renderer-app-installer",
            render(children) {
                const securityProvider = (
                    <SecurityProvider loader={<CircularProgress label={"Checking user..."} />} />
                );

                return <AppInstaller security={securityProvider}>{children}</AppInstaller>;
            }
        },
        {
            type: "app-template-renderer",
            name: "app-template-renderer-admin-theme",
            render(children) {
                return <ThemeProvider>{children}</ThemeProvider>;
            }
        },
        opts.welcomeScreen !== false ?
        {   
            name: "route-welcome",
            type: "route",
            route: (
                <Route
                    exact
                    path={"/"}
                    render={() => (
                        <AdminLayout>
                            <Helmet title={"Welcome!"} />
                            <Welcome />
                        </AdminLayout>
                    )}
                />
            )
        } : null,
    ].filter(Boolean);

    const otherPlugins = [
        fileUploadPlugin(),
        imagePlugin(),
        adminPlugins(),
        i18nPlugins(),
        securityPlugins(),
        cognito(opts.cognito),
        cognitoTheme(),
        ...(opts.plugins || [])
    ];

    return [...appStructure, ...otherPlugins];
});

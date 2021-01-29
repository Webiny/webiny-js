import React, { useCallback, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { css } from "emotion";
import { useSecurity } from "@webiny/app-security";
import { CircularProgress } from "@webiny/ui/Progress";
import { ButtonPrimary } from "@webiny/ui/Button";
import { SplitView, LeftPanel, RightPanel } from "@webiny/app-admin/components/SplitView";
import { Elevation } from "@webiny/ui/Elevation";
import { plugins } from "@webiny/plugins";
import { useInstaller } from "./useInstaller";
import Sidebar from "./Sidebar";

export const Wrapper = styled("section")({
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: "100vh",
    color: "var(--mdc-theme-on-surface)"
});

export const InstallContent = styled("div")({
    maxWidth: 800,
    margin: "0 auto 25px auto",
    ".mdc-elevation--z2": {
        borderRadius: 4,
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.15)"
    }
});

const installerSplitView = css({
    ".webiny-split-view__inner": {
        height: "100vh",
        ".webiny-split-view__right-panel-wrapper": {
            height: "100vh"
        }
    }
});

const SuccessDialog = styled("div")({
    padding: 40,
    textAlign: "center",
    p: {
        paddingBottom: 40
    }
});

export const InnerContent = styled("div")({
    padding: 25,
    position: "relative"
});

const markInstallerAsCompleted = () => (localStorage["wby_installer_status"] = "completed");
const installerCompleted = localStorage["wby_installer_status"] === "completed";

export const AppInstaller = ({ children }) => {
    if (installerCompleted) {
        return children;
    }

    const [finished, setFinished] = useState(false);
    const { identity } = useSecurity();
    const { loading, installers, installer, showNextInstaller, showLogin, onUser } = useInstaller();

    useEffect(() => {
        if (identity) {
            onUser();
        }
    }, [identity]);

    const renderSecurity = useCallback(content => {
        const [plugin] = plugins.byType("app-installer-security");
        if (!plugin) {
            throw Error(`You must register an "app-installer-security" plugin!`);
        }
        return plugin.render(content);
    }, []);

    const renderLayout = (content, secure = false) => {
        return (
            <SplitView className={installerSplitView}>
                <LeftPanel span={2}>
                    <Sidebar
                        allInstallers={installers}
                        installer={installer}
                        showLogin={showLogin}
                    />
                </LeftPanel>
                <RightPanel span={10}>
                    {!showLogin && !secure && content}
                    {(showLogin || secure) && renderSecurity(content)}
                </RightPanel>
            </SplitView>
        );
    };

    const renderBody = content => {
        return (
            <Wrapper>
                <InstallContent>
                    <InnerContent>{content}</InnerContent>
                </InstallContent>
            </Wrapper>
        );
    };

    // Loading installers data
    if (loading) {
        return <CircularProgress label={"Checking apps..."} />;
    }

    // This means there are no installers to run or installation was finished
    if (!loading && (installers.length === 0 || finished)) {
        markInstallerAsCompleted();
        return children;
    }

    if (installer) {
        return renderLayout(
            renderBody(installer.plugin.render({ onInstalled: showNextInstaller })),
            installer.plugin.secure
        );
    }

    return renderLayout(
        renderBody(
            <Elevation z={1}>
                <SuccessDialog>
                    <p>You have successfully installed all new applications!</p>
                    <ButtonPrimary
                        data-testid={"open-webiny-cms-admin-button"}
                        onClick={() => {
                            markInstallerAsCompleted();
                            setFinished(true);
                        }}
                    >
                        Open Admin Area
                    </ButtonPrimary>
                </SuccessDialog>
            </Elevation>
        ),
        true
    );
};

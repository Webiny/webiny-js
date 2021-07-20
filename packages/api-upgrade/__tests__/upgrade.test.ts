import Error from "@webiny/error";
import { UpgradePlugin } from "../src/types";
import { getApplicablePlugin } from "../src";

describe("api upgrade", () => {
    it("should throw UPGRADE_NOT_AVAILABLE", async () => {
        expect(() =>
            getApplicablePlugin({
                upgradeToVersion: "5.1.0",
                deployedVersion: "5.1.0",
                upgradePlugins: [],
                installedAppVersion: "5.0.0"
            })
        ).toThrowError(
            new Error(`Upgrade to version 5.1.0 is not available.`, "UPGRADE_NOT_AVAILABLE")
        );
    });

    it("should throw SKIPPING_UPGRADES_NOT_ALLOWED", async () => {
        expect(() =>
            getApplicablePlugin({
                upgradeToVersion: "5.2.0",
                deployedVersion: "5.2.0",
                upgradePlugins: [
                    {
                        type: "api-upgrade",
                        app: "test",
                        version: "5.2.0",
                        async apply() {
                            // Install 5.2.0
                        }
                    },
                    {
                        type: "api-upgrade",
                        app: "test",
                        version: "5.1.0",
                        async apply() {
                            // Install 5.1.0
                        }
                    }
                ],
                installedAppVersion: "5.0.0"
            })
        ).toThrowError(
            new Error(
                `Skipping of upgrades is not allowed: https://www.webiny.com/docs/how-to-guides/upgrade-webiny/overview/`
            )
        );
    });

    it("should throw VERSION_ALREADY_INSTALLED", async () => {
        expect(() =>
            getApplicablePlugin({
                upgradeToVersion: "5.1.0",
                deployedVersion: "5.1.0",
                upgradePlugins: [],
                installedAppVersion: "5.1.0"
            })
        ).toThrowError(
            new Error(`Version 5.1.0 is already installed!`, "VERSION_ALREADY_INSTALLED")
        );
    });

    it("should throw UPGRADE_VERSION_MISMATCH", async () => {
        expect(() =>
            getApplicablePlugin({
                upgradeToVersion: "5.1.0",
                deployedVersion: "5.0.0",
                upgradePlugins: [],
                installedAppVersion: "5.0.0"
            })
        ).toThrowError(
            new Error(`The requested upgrade version does not match the deployed version.`)
        );
    });

    it("should return an applicable plugin", async () => {
        const upgradePlugins: UpgradePlugin[] = [
            {
                type: "api-upgrade",
                app: "test",
                version: "5.2.0",
                async apply() {
                    // Install 5.2.0
                }
            },
            {
                type: "api-upgrade",
                app: "test",
                version: "5.1.0",
                async apply() {
                    // Install 5.1.0
                }
            },
            {
                type: "api-upgrade",
                app: "test",
                version: "5.0.2",
                async apply() {
                    // Install 5.0.2
                }
            }
        ];

        const plugin = getApplicablePlugin({
            upgradeToVersion: "5.2.0",
            deployedVersion: "5.2.0",
            upgradePlugins,
            installedAppVersion: "5.1.0"
        });

        expect(plugin).toEqual(upgradePlugins[0]);
    });

    it(`should work with "deployedVersion" containing pre-id`, async () => {
        const upgradePlugins: UpgradePlugin[] = [
            {
                type: "api-upgrade",
                app: "test",
                version: "5.5.0",
                async apply() {
                    // Install 5.5.0
                }
            }
        ];

        const plugin = getApplicablePlugin({
            upgradeToVersion: "5.5.0",
            deployedVersion: "5.5.0-next.0",
            upgradePlugins: upgradePlugins,
            installedAppVersion: "5.0.0"
        });

        expect(plugin).toEqual(upgradePlugins[0]);
        // Should throw UPGRADE_VERSION_MISMATCH error if deployedVersion after deployedVersion doesn't match.
        expect(() =>
            getApplicablePlugin({
                upgradeToVersion: "5.5.0",
                deployedVersion: "5.5.1-next.0",
                upgradePlugins: [],
                installedAppVersion: "5.0.0"
            })
        ).toThrowError(
            new Error(`The requested upgrade version does not match the deployed version.`)
        );
    });
});

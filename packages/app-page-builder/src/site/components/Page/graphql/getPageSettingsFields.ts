// @flow
import { getPlugins } from "@webiny/plugins";
import type { PbPageSettingsFieldsPlugin } from "@webiny/app-page-builder/types";

export default () => {
    return getPlugins("pb-page-settings-fields")
        .map((pl: PbPageSettingsFieldsPlugin) => pl.fields)
        .join("\n");
};

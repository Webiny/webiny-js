import contentBackground from "./../plugins/background";
import blockEditing from "./../plugins/blockEditing";
import elements from "./../plugins/elements";
import icons from "./../plugins/icons";
import elementActions from "./../plugins/elementActions";
import elementGroups from "./../plugins/elementGroups";
import blocks from "./../plugins/blocks";
import blocksCategories from "./../plugins/blocksCategories";
import toolbar from "./../plugins/toolbar";
import elementSettings from "./../plugins/elementSettings";
import defaultBarPlugins from "./../plugins/defaultBar";
import pageSettingsPlugins from "./../plugins/pageSettings";
import breadcrumbs from "./../plugins/breadcrumbs";
import { gridPresets } from "./../plugins/gridPresets";
import {
    createElementPlugin,
    updateElementPlugin,
    togglePluginPlugin,
    saveRevisionPlugin,
    dropElementPlugin,
    deleteElementPlugin,
    deactivatePluginPlugin,
    updateRevisionPlugin,
    resizePlugin,
    dragPlugin
} from "../recoil/actions/plugins";

export default () => [
    contentBackground,
    breadcrumbs,
    elementActions,
    elementGroups,
    blockEditing,
    elements,
    blocks,
    blocksCategories,
    toolbar,
    elementSettings,
    defaultBarPlugins,
    pageSettingsPlugins,
    icons,
    ...gridPresets,
    // action registration
    createElementPlugin(),
    updateElementPlugin(),
    togglePluginPlugin(),
    saveRevisionPlugin(),
    dropElementPlugin(),
    deactivatePluginPlugin(),
    deleteElementPlugin(),
    updateRevisionPlugin(),
    ...resizePlugin(),
    ...dragPlugin()
];

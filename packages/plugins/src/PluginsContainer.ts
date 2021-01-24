import { Plugin } from "./types";
import uniqid from "uniqid";

const isOptionsObject = item => item && !Array.isArray(item) && !item.type && !item.name;
const normalizeArgs = args => {
    let options = {};

    // Check if last item in the plugins array is actually an options object.
    if (isOptionsObject(args[args.length - 1])) {
        [options] = args.splice(-1, 1);
    }

    return [args, options];
};

const assign = (plugins: any, options, target: Object): void => {
    for (let i = 0; i < plugins.length; i++) {
        const plugin = plugins[i];
        if (Array.isArray(plugin)) {
            assign(plugin, options, target);
            continue;
        }

        let name = plugin._name || plugin.name;
        if (!name) {
            plugin.name = name = uniqid(plugin.type + "-");
        }

        // If skip existing was set to true, and a plugin with the same name was already registered, skip registration.
        if (!options.skipExisting || !target[name]) {
            target[name] = plugin;
            plugin.init && plugin.init();
        }
    }
};

export class PluginsContainer {
    private plugins: Record<string, Plugin> = {};
    private _byTypeCache: Map<string, Plugin[]> = new Map();

    constructor(...args) {
        this.register(...args);
    }

    public byName<T extends Plugin = Plugin>(name: string): T {
        return this.plugins[name] as T;
    }

    public byType<T extends Plugin>(type: string): T[] {
        if (this._byTypeCache.has(type)) {
            return this._byTypeCache.get(type) as T[];
        }
        const plugins = this.findByType<T>(type);
        this._byTypeCache.set(type, plugins);
        return plugins;
    }

    public atLeastOneByType<T extends Plugin>(type: string): T[] {
        const list = this.byType<T>(type);
        if (list.length === 0) {
            throw new Error(`There are no plugins by type "${type}".`);
        }
        return list;
    }

    public oneByType<T extends Plugin>(type: string): T {
        const list = this.atLeastOneByType<T>(type);
        if (list.length > 1) {
            throw new Error(
                `There is a requirement for plugin of type "${type}" to be only one registered.`
            );
        }
        return list[0];
    }

    public all<T extends Plugin>(): T[] {
        return Object.values(this.plugins) as T[];
    }

    public register(...args: any): void {
        // reset the cache when adding new plugins
        this._byTypeCache.clear();
        const [plugins, options] = normalizeArgs(args);
        assign(plugins, options, this.plugins);
    }

    public unregister(name: string): void {
        // reset the cache when removing a plugin
        this._byTypeCache.clear();
        delete this.plugins[name];
    }

    private findByType<T extends Plugin>(type: string): T[] {
        return Object.values(this.plugins).filter((pl: Plugin) => pl.type === type) as T[];
    }
}

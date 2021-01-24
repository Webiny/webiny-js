import { PluginsContainer } from "../src";

const mockPlugins = [
    {
        type: "ui-plugin",
        name: "ui-plugin-1",
        init: () => {
            return true;
        }
    },
    {
        type: "ui-plugin",
        name: "ui-plugin-2",
        init: () => {
            return true;
        }
    },
    {
        type: "ui-plugin",
        name: "ui-plugin-3",
        init: () => {
            return true;
        }
    },
    {
        type: "ui-plugin",
        name: "ui-plugin-4",
        init: () => {
            return true;
        }
    },
    {
        type: "ui-plugin",
        name: "ui-plugin-5",
        init: () => {
            return true;
        }
    },
    {
        type: "api-plugin",
        name: "api-plugin-1",
        init: () => {
            return true;
        }
    },
    {
        type: "api-plugin",
        name: "api-plugin-2",
        init: () => {
            return true;
        }
    },
    {
        type: "api-plugin",
        name: "api-plugin-3",
        init: () => {
            return true;
        }
    }
];

describe("plugins", () => {
    let plugins;

    beforeEach(() => {
        plugins = new PluginsContainer();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    test("plugins.register, plugins.unregister, plugins.byName, plugins.byType", async () => {
        plugins.register(
            {
                type: "test",
                name: "test-1"
            },
            [
                {
                    type: "test",
                    name: "test-2"
                },
                {
                    type: "test",
                    name: "test-3"
                },
                [
                    {
                        type: "test",
                        name: "test-5"
                    },
                    {
                        type: "test",
                        name: "test-6"
                    },
                    [
                        {
                            type: "test",
                            name: "test-7"
                        }
                    ]
                ]
            ],
            {
                _name: "test-4",
                name: "Something...",
                type: "test"
            }
        );

        expect(plugins.byType("test").length).toBe(7);
        expect(plugins.byType("testXYZ").length).toBe(0);

        expect(plugins.byName("test-1")).toEqual({
            type: "test",
            name: "test-1"
        });

        expect(plugins.byName("test-2")).toEqual({
            type: "test",
            name: "test-2"
        });

        expect(plugins.byName("test-3")).toEqual({
            type: "test",
            name: "test-3"
        });

        plugins.unregister("test-3");

        expect(plugins.all().length).toBe(6);
        expect(plugins.byType("test").length).toBe(6);
        expect(plugins.byType("testXYZ").length).toBe(0);

        expect(plugins.byName("test-1")).toEqual({
            type: "test",
            name: "test-1"
        });

        expect(plugins.byName("test-2")).toEqual({
            type: "test",
            name: "test-2"
        });

        expect(plugins.byName("test-4")).toEqual({
            type: "test",
            name: "Something...",
            _name: "test-4"
        });

        expect(plugins.byName("test-3")).toEqual(undefined);
    });

    test(`if present, "init" method must be executed upon adding`, async () => {
        let initialized = false;
        plugins.register({
            type: "test",
            name: "test-1",
            init: () => (initialized = true)
        });

        expect(initialized).toBe(true);
    });

    test("load a type only once internally", async () => {
        const byTypeSpy = jest.spyOn(plugins, "byType");
        const findByTypeSpy = jest.spyOn(plugins, "findByType");

        plugins.register(mockPlugins);

        for (let i = 0; i < 50; i++) {
            const found = plugins.byType("ui-plugin");
            expect(found).toHaveLength(5);
        }

        expect(findByTypeSpy).toBeCalledTimes(1);
        expect(byTypeSpy).toBeCalledTimes(50);

        jest.restoreAllMocks();
    });

    test("it should clear internal cache when registering a new plugin", async () => {
        const byTypeSpy = jest.spyOn(plugins, "byType");
        const findByTypeSpy = jest.spyOn(plugins, "findByType");

        plugins.register(mockPlugins);

        const register = [13, 17, 24, 42, 47];
        let registeredAmount = 0;

        for (let i = 0; i < 50; i++) {
            const found = plugins.byType("ui-plugin");
            // found plugins is initially registered amount + newly registered amount
            expect(found).toHaveLength(5 + registeredAmount);
            // at given numbers we will register ui-plugin-${number}
            if (register.includes(i)) {
                plugins.register([
                    {
                        type: "ui-plugin",
                        name: `ui-plugin-${i}`,
                        init: () => {
                            return true;
                        }
                    }
                ]);
                registeredAmount++;
            }
        }

        expect(findByTypeSpy).toBeCalledTimes(register.length + 1);
        expect(byTypeSpy).toBeCalledTimes(50);

        jest.restoreAllMocks();
    });

    test("it should clear internal cache when unregistering a plugin", async () => {
        const byTypeSpy = jest.spyOn(plugins, "byType");
        const findByTypeSpy = jest.spyOn(plugins, "findByType");

        plugins.register(mockPlugins);

        const unregister = [23, 28, 33, 34, 39];

        let unregisteredAmount = 0;

        for (let i = 20; i < 40; i++) {
            plugins.register({
                type: "ui-plugin",
                name: `ui-plugin-${i}`,
                init: () => {
                    return true;
                }
            });
        }

        for (let i = 0; i < 50; i++) {
            const found = plugins.byType("ui-plugin");
            // found plugins is always initial registered amount reduced by unregistered amount of plugins
            expect(found).toHaveLength(25 - unregisteredAmount);
            // at given number we will unregister ui-plugin-${i}
            if (unregister.includes(i)) {
                plugins.unregister(`ui-plugin-${i}`);
                unregisteredAmount++;
            }
        }

        expect(findByTypeSpy).toBeCalledTimes(unregister.length + 1);
        expect(byTypeSpy).toBeCalledTimes(50);

        jest.restoreAllMocks();
    });
});

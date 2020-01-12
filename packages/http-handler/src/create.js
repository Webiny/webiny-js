import { PluginsContainer } from "@webiny/plugins";
import createResponse from "./createResponse";

export default (...plugins) => async (...args) => {
    const context = {
        plugins: new PluginsContainer(plugins)
    };

    const contextPlugins = context.plugins.byType("context");
    for (let i = 0; i < contextPlugins.length; i++) {
        contextPlugins[i].apply({ context, args });
    }

    let handlers = context.plugins.byType("before-handle");
    for (let i = 0; i < handlers.length; i++) {
        await handlers[i].handle({ context, args });
    }

    let result;
    handlers = context.plugins.byType("handler");
    for (let i = 0; i < handlers.length; i++) {
        const handler = handlers[i];
        if (handler.canHandle({ context, args })) {
            result = await handler.handle({ context, args });
        }
    }

    handlers = context.plugins.byType("after-handle");
    for (let i = 0; i < handlers.length; i++) {
        await handlers[i].handle({ context, args, result });
    }

    if (!result) {
        return createResponse({
            body: "Request not handled. Please check registered handlers."
        });
    }

    return result;
};

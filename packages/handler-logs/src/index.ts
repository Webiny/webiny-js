import fetch from "node-fetch";
const consoleLog = console.log;

const logs = [];
console.log = (...args) => {
    logs.push({
        args,
        meta: {
            functionName: process.env.AWS_LAMBDA_FUNCTION_NAME
        }
    });
    consoleLog(...args);
};

export default () => ({
    type: "handler-result",
    async apply(result, context) {
        const url = process.env.WEBINY_LOGS_FORWARD_URL;
        const forwardLogs = context.debug ? context.debug.logs : logs;
        forwardLogs.forEach(log => {
            log.meta.functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
        });
        if (forwardLogs.length && typeof url === "string" && url.startsWith("http")) {
            await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Bypass-Tunnel-Reminder": "1"
                },
                body: JSON.stringify(forwardLogs)
            });
        }
        logs.length = 0;
    }
});

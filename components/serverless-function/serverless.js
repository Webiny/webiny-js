const path = require("path");
const execa = require("execa");
const { Component } = require("@serverless/core");
const LambdaClient = require("aws-sdk/clients/lambda");

class ServerlessFunction extends Component {
    async default(inputs = {}) {
        if (inputs.hook) {
            if (!inputs.root) {
                throw Error(`"hook" input requires "root" to be set.`);
            }
            const functionRoot = path.join(this.context.instance.root, inputs.root);
            this.context.log("Building function");
            const hooks = Array.isArray(inputs.hook) ? inputs.hook : [inputs.hook];
            for (let i = 0; i < hooks.length; i++) {
                const [cmd, ...args] = hooks[i].split(" ");
                await execa(cmd, args, {
                    cwd: functionRoot,
                    env: { NODE_ENV: "production" },
                    stdio: "inherit"
                });
            }
        }

        const lambda = await this.load("@serverless/function");
        const output = await lambda(inputs);

        output.concurrencyLimit = null;
        if (inputs.concurrencyLimit) {
            if (inputs.concurrencyLimit !== this.state.output.concurrencyLimit) {
                this.context.instance.debug(
                    `Setting function's concurrency limit to ${inputs.concurrencyLimit}.`
                );
                const lambdaClient = new LambdaClient({ region: inputs.region });
                await lambdaClient
                    .putFunctionConcurrency({
                        FunctionName: output.arn,
                        ReservedConcurrentExecutions: inputs.concurrencyLimit
                    })
                    .promise();
                output.concurrencyLimit = inputs.concurrencyLimit;
            }
        } else {
            if (this.state.output.concurrencyLimit) {
                this.context.instance.log(`Removing function's concurrency limit.`);
                const lambdaClient = new LambdaClient({ region: inputs.region });
                await lambdaClient
                    .deleteFunctionConcurrency({ FunctionName: output.arn })
                    .promise();
                output.concurrencyLimit = null;
            }
        }

        this.state.output = output;
        await this.save();

        return output;
    }

    async remove(inputs = {}) {
        const lambda = await this.load("@serverless/function");
        await lambda.remove(inputs);

        this.state = {};
        await this.save();
    }
}

module.exports = ServerlessFunction;

module.exports = {
    template: "[TEMPLATE_VERSION]",
    projectName: "[PROJECT_NAME]",
    cli: {
        plugins: [
            require("@webiny/cli-plugin-workspaces")(),
            require("@webiny/cli-plugin-deploy-pulumi")(),
            require("@webiny/api-page-builder/cli")(),
            require("@webiny/cwp-template-aws/cli")(),
            require("@webiny/cli-plugin-scaffold").default(),
            require("@webiny/cli-plugin-scaffold-graphql-service").default(),
            require("@webiny/cli-plugin-scaffold-admin-app-module").default(),
            require("@webiny/cli-plugin-scaffold-react-component").default()
        ]
    }
};

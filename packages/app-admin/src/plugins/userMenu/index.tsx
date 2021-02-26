import React from "react";
import { AdminHeaderRightPlugin } from "../../types";
import UserMenu from "./UserMenu";

const plugin: AdminHeaderRightPlugin = {
    name: "admin-header-user-menu",
    type: "admin-header-right",
    render() {
        return <UserMenu />;
    }
};

export default plugin;

import React from "react";
import { View } from "@webiny/ui-composer/View";
import { SplitView } from "~/views/Users/SplitView";
import { UsersFormView } from "~/views/Users/UsersFormView";
import { useUserForm } from "~/views/Users/hooks/useUserForm";
import { ViewElement } from "~/views/Users/elements/ViewElement";
import { AdminView } from "~/views/Users/AdminView";
import { ButtonElement } from "~/views/Users/elements/ButtonElement";
import Logo from "@webiny/app-admin/plugins/logo/Logo";
import { AdminViewPlugin } from "~/views/Users/AdminViewPlugin";
import {plugins} from "@webiny/plugins";

export class UsersView extends View {
    constructor() {
        super("admin-users-view");
        this.addElements();
    }

    private addElements() {
        const adminLayout = new AdminView();
        adminLayout.setTitle("Security - Users");

        const splitView = new SplitView("admin-users-split-view", {
            rightPanel: new ViewElement("admin-users-form", {
                view: new UsersFormView(),
                hook: useUserForm
            })
        });

        adminLayout.setContentElement(new ViewElement("split-view", { view: splitView }));

        this.addElement(adminLayout);

        // Experimental
        this.getElement("headerRight").addElement(
            new ButtonElement("left-form", {
                label: "Show on the left",
                type: "primary",
                onClick: ({ render }) => {
                    splitView.getRightPanel().moveToTheLeftOf(splitView.getLeftPanel());
                    render();
                }
            })
        );

        this.getElement("headerRight").addElement(
            new ButtonElement("right-form", {
                label: "Show on the right",
                type: "primary",
                onClick: ({ render }) => {
                    splitView.getRightPanel().moveToTheRightOf(splitView.getLeftPanel());
                    render();
                }
            })
        );
    }
}

class MyAdminViewPlugin extends AdminViewPlugin {
    apply(view: AdminView): void {
        view.setLogo(<Logo white />);
    }
}

plugins.register(new MyAdminViewPlugin());

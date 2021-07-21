import { ViewPlugin } from "@webiny/ui-composer/View";
import { UsersFormView } from "~/views/Users/UsersFormView";

export abstract class UsersFormViewPlugin extends ViewPlugin<UsersFormView> {
    static type = "view.users.form";
}

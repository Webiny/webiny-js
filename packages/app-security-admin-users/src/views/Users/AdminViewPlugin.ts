import { ViewPlugin } from "@webiny/ui-composer/View";
import { AdminView } from "~/views/Users/AdminView";

export abstract class AdminViewPlugin extends ViewPlugin<AdminView> {
    static type = "view.admin";
}

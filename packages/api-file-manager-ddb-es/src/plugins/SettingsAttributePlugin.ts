import { AttributePlugin, Params } from "@webiny/db-dynamodb/plugins";

export class SettingsAttributePlugin extends AttributePlugin {
    public constructor(params: Omit<Params, "entity">) {
        super({
            ...params,
            entity: "Settings"
        });
    }
}

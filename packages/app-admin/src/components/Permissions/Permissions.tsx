import React, { useMemo } from "react";
import { AdminAppPermissionRendererPlugin } from "../../types";
import { Accordion } from "@webiny/ui/Accordion";
import { plugins } from "@webiny/plugins";
import { BindComponentRenderProp } from "@webiny/form";

type Props = BindComponentRenderProp & {
    id: string;
};

type PermissionPlugins = {
    systemPlugins: AdminAppPermissionRendererPlugin[];
    permissionPlugins: AdminAppPermissionRendererPlugin[];
};

export const Permissions = ({ id, value, onChange }: Props) => {
    const { systemPlugins, permissionPlugins } = useMemo<PermissionPlugins>(() => {
        return plugins
            .byType<AdminAppPermissionRendererPlugin>("admin-app-permissions-renderer")
            .reduce(
                (acc, plugin) => {
                    if (plugin.system === true) {
                        acc.systemPlugins.push(plugin);
                    } else {
                        acc.permissionPlugins.push(plugin);
                    }
                    return acc;
                },
                { systemPlugins: [], permissionPlugins: [] }
            );
    }, []);

    return (
        <Accordion elevation={0}>
            {[...systemPlugins, ...permissionPlugins].map(pl => (
                <React.Fragment key={pl.name + "." + id}>
                    {pl.render({
                        value,
                        onChange
                    })}
                </React.Fragment>
            ))}
        </Accordion>
    );
};

import React from "react";
import get from "lodash/get";
import pluralize from "pluralize";
import { i18n } from "@webiny/app/i18n";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery } from "../../hooks";
import { LIST_MENU_CONTENT_GROUPS_MODELS } from "./../../viewsGraphql";
import usePermission from "../../hooks/usePermission";

const t = i18n.ns("app-headless-cms/admin/menus");

const ContentModelMenuItems = ({ Section, Item }) => {
    const response = useQuery(LIST_MENU_CONTENT_GROUPS_MODELS);
    const { canRead } = usePermission();

    const { data } = get(response, "data.listContentModelGroups") || {};
    if (!data) {
        return null;
    }

    return data.map(contentModelGroup => {
        return (
            <Section
                key={contentModelGroup.id}
                name={`cms-content-models-${contentModelGroup.id}`}
                label={contentModelGroup.name}
                icon={
                    <FontAwesomeIcon
                        style={{ color: "var(--mdc-theme-text-secondary-on-background)" }}
                        icon={contentModelGroup.icon.split("/")}
                    />
                }
            >
                {(contentModelGroup.contentModels.length === 0 ||
                    contentModelGroup.contentModels.every(
                        contentModel =>
                            !canRead({
                                contentModelGroup,
                                contentModel,
                                permissionName: "cms.contentEntry"
                            })
                    )) && (
                    <Item style={{ opacity: 0.4 }} key={"empty-item"} label={t`Nothing to show.`} />
                )}
                {contentModelGroup.contentModels.map(contentModel =>
                    canRead({
                        contentModelGroup,
                        contentModel,
                        permissionName: "cms.contentEntry"
                    }) ? (
                        <Item
                            key={contentModel.modelId}
                            label={pluralize(contentModel.name)}
                            path={`/cms/content-entries/${contentModel.modelId}`}
                        />
                    ) : null
                )}
            </Section>
        );
    });
};

export default ContentModelMenuItems;

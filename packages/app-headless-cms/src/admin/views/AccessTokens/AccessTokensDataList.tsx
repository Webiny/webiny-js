import React from "react";
import { i18n } from "@webiny/app/i18n";
import { ConfirmationDialog } from "@webiny/ui/ConfirmationDialog";
import { DeleteIcon } from "@webiny/ui/List/DataList/icons";
import { useCrud } from "@webiny/app-admin/hooks/useCrud";
import { Typography } from "@webiny/ui/Typography";

import {
    DataList,
    List,
    ListItem,
    ListItemText,
    ListItemTextSecondary,
    ListItemMeta,
    ListActions
} from "@webiny/ui/List";
import { Link } from "@webiny/react-router";

const t = i18n.ns("app-headless-cms/admin/environmentAliases/data-list");

const EnvironmentAliasesDataList = () => {
    const { actions, list } = useCrud();

    return (
        <DataList
            {...list}
            title={t`Access Tokens`}
            sorters={[
                {
                    label: t`Newest to oldest`,
                    sorters: { createdOn: -1 }
                },
                {
                    label: t`Oldest to newest`,
                    sorters: { createdOn: 1 }
                },
                {
                    label: t`Name A-Z`,
                    sorters: { name: 1 }
                },
                {
                    label: t`Name Z-A`,
                    sorters: { name: -1 }
                }
            ]}
        >
            {({ data, isSelected, select }) => (
                <List data-testid="default-data-list">
                    {data.map(item => (
                        <ListItem key={item.id} selected={isSelected(item)}>
                            <ListItemText onClick={() => select(item)}>
                                {item.name}{" "}
                                {item.default && (
                                    <Typography use={"overline"}>{t`(default)`}</Typography>
                                )}
                                <ListItemTextSecondary>
                                    {item.environment
                                        ? t`Assigned to: {environment}`({
                                              environment: (
                                                  <Link
                                                      onClick={e => e.stopPropagation()}
                                                      to={`/settings/cms/environments?id=${item.environment.id}`}
                                                      title={t`This environment alias points to the "{environment}" environment.`(
                                                          { environment: item.environment.name }
                                                      )}
                                                  >
                                                      {item.environment.name}
                                                  </Link>
                                              )
                                          })
                                        : t`No environment.`}
                                </ListItemTextSecondary>
                            </ListItemText>

                            <ListItemMeta>
                                <ListActions>
                                    <ConfirmationDialog>
                                        {({ showConfirmation }) => (
                                            <DeleteIcon
                                                onClick={() => {
                                                    showConfirmation(() => actions.delete(item));
                                                }}
                                            />
                                        )}
                                    </ConfirmationDialog>
                                </ListActions>
                            </ListItemMeta>
                        </ListItem>
                    ))}
                </List>
            )}
        </DataList>
    );
};

export default EnvironmentAliasesDataList;

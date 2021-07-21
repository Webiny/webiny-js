import React, { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/react-hooks";
import orderBy from "lodash/orderBy";
import { i18n } from "@webiny/app/i18n";
import { useSecurity } from "@webiny/app-security";
import { Tooltip } from "@webiny/ui/Tooltip";
import { Image } from "@webiny/app/components";
import {
    DataList,
    ScrollList,
    ListItem,
    ListItemText,
    ListItemTextSecondary,
    ListItemMeta,
    ListActions,
    ListItemGraphic,
    DataListModalOverlayAction,
    DataListModalOverlay
} from "@webiny/ui/List";
import { ButtonIcon, ButtonSecondary } from "@webiny/ui/Button";
import { DeleteIcon } from "@webiny/ui/List/DataList/icons";
import { Avatar } from "@webiny/ui/Avatar";
import { Cell, Grid } from "@webiny/ui/Grid";
import { Select } from "@webiny/ui/Select";
import { useRouter } from "@webiny/react-router";
import { useSnackbar } from "@webiny/app-admin/hooks/useSnackbar";
import { useConfirmationDialog } from "@webiny/app-admin/hooks/useConfirmationDialog";
import SearchUI from "@webiny/app-admin/components/SearchUI";
import { ReactComponent as AddIcon } from "@webiny/app-admin/assets/icons/add-18px.svg";
import { ReactComponent as FilterIcon } from "@webiny/app-admin/assets/icons/filter-24px.svg";
import { DELETE_USER, LIST_USERS } from "./graphql";
import { serializeSorters, deserializeSorters } from "../utils";

const t = i18n.ns("app-identity/admin/users/data-list");

const SORTERS = [
    {
        label: t`Newest to oldest`,
        sorters: { createdOn: "desc" }
    },
    {
        label: t`Oldest to newest`,
        sorters: { createdOn: "asc" }
    },
    {
        label: t`Login A-Z`,
        sorters: { login: "asc" }
    },
    {
        label: t`Login Z-A`,
        sorters: { login: "desc" }
    }
];

const UsersDataList = () => {
    const [filter, setFilter] = useState("");
    const [sort, setSort] = useState(serializeSorters(SORTERS[0].sorters));
    const { identity } = useSecurity();
    const { history } = useRouter();
    const { showSnackbar } = useSnackbar();
    const { showConfirmation } = useConfirmationDialog();

    const filterUsers = useCallback(
        ({ login, firstName, lastName }) => {
            return (
                login.toLowerCase().includes(filter) ||
                firstName.toLowerCase().includes(filter) ||
                lastName.toLowerCase().includes(filter)
            );
        },
        [filter]
    );

    const sortUsers = useCallback(
        users => {
            if (!sort) {
                return users;
            }
            const [[key, value]] = Object.entries(deserializeSorters(sort));
            return orderBy(users, [key], [value]);
        },
        [sort]
    );

    const { data: listUsers, loading: usersLoading } = useQuery(LIST_USERS);

    const [deleteIt, { loading: deleteLoading }] = useMutation(DELETE_USER, {
        refetchQueries: [{ query: LIST_USERS }]
    });

    const data = usersLoading && !listUsers ? [] : listUsers.security.users.data || [];
    const filteredData = filter === "" ? data : data.filter(filterUsers);
    const userList = sortUsers(filteredData);
    const login = new URLSearchParams(location.search).get("login");

    const deleteItem = useCallback(
        item => {
            showConfirmation(async () => {
                const response = await deleteIt({
                    variables: item
                });

                const error = response?.data?.security?.deleteUser?.error;
                if (error) {
                    return showSnackbar(error.message);
                }

                showSnackbar(t`User "{login}" deleted.`({ login: item.login }));

                if (login === item.login) {
                    history.push(`/security/users`);
                }
            });
        },
        [login]
    );

    const usersDataListModalOverlay = useMemo(
        () => (
            <DataListModalOverlay>
                <Grid>
                    <Cell span={12}>
                        <Select value={sort} onChange={setSort} label={t`Sort by`}>
                            {SORTERS.map(({ label, sorters }) => {
                                return (
                                    <option key={label} value={serializeSorters(sorters)}>
                                        {label}
                                    </option>
                                );
                            })}
                        </Select>
                    </Cell>
                </Grid>
            </DataListModalOverlay>
        ),
        [sort]
    );

    const loading = usersLoading || deleteLoading;

    return (
        <DataList
            title={t`Security Users`}
            actions={
                <ButtonSecondary
                    data-testid="new-record-button"
                    onClick={() => history.push("/security/users?new=true")}
                >
                    <ButtonIcon icon={<AddIcon />} /> {t`New User`}
                </ButtonSecondary>
            }
            data={userList}
            loading={loading}
            search={
                <SearchUI value={filter} onChange={setFilter} inputPlaceholder={t`Search users`} />
            }
            modalOverlay={usersDataListModalOverlay}
            modalOverlayAction={<DataListModalOverlayAction icon={<FilterIcon />} />}
        >
            {({ data }) => (
                <ScrollList twoLine avatarList>
                    {data.map(item => (
                        <ListItem key={item.login} selected={item.login === login}>
                            <ListItemGraphic>
                                <Avatar
                                    renderImage={props => (
                                        <Image {...props} transform={{ width: 100 }} />
                                    )}
                                    src={item.avatar ? item.avatar.src : item.gravatar}
                                    fallbackText={item.firstName}
                                    alt={t`User's avatar.`}
                                />
                            </ListItemGraphic>
                            <ListItemText
                                onClick={() =>
                                    history.push(
                                        `/security/users?login=${encodeURIComponent(item.login)}`
                                    )
                                }
                            >
                                {item.firstName} {item.lastName}
                                <ListItemTextSecondary>{item.login}</ListItemTextSecondary>
                            </ListItemText>

                            <ListItemMeta>
                                <ListActions>
                                    {identity && identity.id !== item.login ? (
                                        <DeleteIcon onClick={() => deleteItem(item)} />
                                    ) : (
                                        <Tooltip
                                            placement={"bottom"}
                                            content={
                                                <span>{t`You can't delete your own user account.`}</span>
                                            }
                                        >
                                            <DeleteIcon disabled />
                                        </Tooltip>
                                    )}
                                </ListActions>
                            </ListItemMeta>
                        </ListItem>
                    ))}
                </ScrollList>
            )}
        </DataList>
    );
};

export default UsersDataList;

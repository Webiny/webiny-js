import React from "react";
import { ViewComponent } from "@webiny/ui-composer/View";
import { SplitView, LeftPanel, RightPanel } from "@webiny/app-admin/components/SplitView";
import UsersDataList from "./UsersDataList";
import UsersForm from "./UsersForm";
import { UsersFormView } from "~/views/Users/UsersFormView";
import { useUserForm } from "~/views/Users/hooks/useUserForm";

const Users = () => {
    return (
        <SplitView>
            <LeftPanel>
                <UsersDataList />
            </LeftPanel>
            <RightPanel>
                <ViewComponent view={new UsersFormView()} hook={useUserForm} />
                {/*<UsersForm />*/}
            </RightPanel>
        </SplitView>
    );
};

export default Users;

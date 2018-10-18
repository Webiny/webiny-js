// @flow
import * as React from "react";
import { compose, withProps } from "recompose";
import { graphql } from "react-apollo";
import { getPlugins } from "webiny-app/plugins";
import { withRouter } from "webiny-app/components";
import { type WithPageDetailsProps } from "webiny-app-cms/admin/components";
import { PageDetailsProvider, PageDetailsConsumer } from "../../components/PageDetailsContext";
import type { WithRouterProps } from "webiny-app/components";
import { loadRevision, loadPageRevisions } from "./graphql";

type Props = WithRouterProps & {
    pageId: string,
    revision: {
        data: Object,
        loading: boolean,
        refetch: Function
    },
    revisions: {
        data: Array<Object>,
        loading: boolean,
        refetch: Function
    }
};

const renderPlugins = (type: string, params: WithPageDetailsProps) => {
    return getPlugins(type).map(plugin => {
        const plContent = plugin.render(params);
        if (plContent) {
            return React.cloneElement(plContent, { key: plugin.name });
        }

        return null;
    });
};

const PageDetails = ({ router, pageId, revision, revisions }: Props) => {
    if (!router.getQuery("revision")) {
        return <div>Select a page on the left!</div>;
    }

    const details = { pageId, revision, revisions };

    return (
        <PageDetailsProvider value={details}>
            <PageDetailsConsumer>
                {pageDetails => (
                    <React.Fragment>
                        {renderPlugins("cms-page-details", { pageDetails })}
                    </React.Fragment>
                )}
            </PageDetailsConsumer>
        </PageDetailsProvider>
    );
};

export default compose(
    withRouter(),
    withProps(({ router }) => ({
        pageId: router.getQuery("id"),
        revisionId: router.getQuery("revision")
    })),
    graphql(loadRevision, {
        skip: props => !props.revisionId,
        options: ({ revisionId }) => ({ variables: { id: revisionId } }),
        props: ({ data }) => {
            return {
                revision: {
                    loading: data.loading,
                    data: data.loading ? {} : data.cms.revision.data,
                    refetch: data.refetch
                }
            };
        }
    }),
    graphql(loadPageRevisions, {
        skip: props => !props.pageId,
        options: ({ pageId }) => ({ variables: { id: pageId } }),
        props: ({ data }) => ({
            revisions: {
                loading: data.loading,
                data: data.loading ? [] : data.cms.revisions.data,
                refetch: data.refetch
            }
        })
    })
)(PageDetails);

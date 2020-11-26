export const DATA_FIELD = /* GraphQL */ `
    {
        id
        # createdBy
        # updatedBy
        savedOn
        createdOn
        # deletedOn
        publishedOn
        version
        name
        # fields
        layout
        settings {
           reCaptcha {
               settings {
                   enabled
                   siteKey
                   secretKey
               }
           } 
        }
        triggers
        published
        locked
        status
        parent
        # revisions
        # publishedRevisions
        stats {
            views
            submissions
        }
        # overallStats
    }
`;

export const ERROR_FIELD = /* GraphQL */ `
    {
        code
        data
        message
    }
`;

export const CREATE_FROM = /* GraphQL */ `
    mutation CreateForm($data: CreateFormInput!) {
        formBuilder {
            createForm(data: $data) {
                data ${DATA_FIELD}
                error ${ERROR_FIELD}
            }
        }
    }
`;

// Create a new revision from an existing revision
export const CREATE_REVISION_FROM = /* GraphQL */ `
    mutation CreateRevisionFrom($revision: ID!) {
        formBuilder {
            createRevisionFrom(revision: $revision) {
                data ${DATA_FIELD}
                error ${ERROR_FIELD}
            }
        }
    }
`;

export const UPDATE_REVISION = /* GraphQL */ `
    mutation UpdateRevision($id: ID!, $data: UpdateFormInput!) {
        formBuilder {
            updateRevision(id: $id, data: $data) {
                data ${DATA_FIELD}
                error ${ERROR_FIELD}
            }
        }
    }
`;

export const PUBLISH_REVISION = /* GraphQL */ `
    mutation publishRevision($id: ID!) {
        formBuilder {
            publishRevision(id: $id) {
                data ${DATA_FIELD}
                error ${ERROR_FIELD}
            }
        }
    }
`;

export const UNPUBLISH_REVISION = /* GraphQL */ `
    mutation UnpublishRevision($id: ID!) {
        formBuilder {
            unpublishRevision(id: $id) {
                data ${DATA_FIELD}
                error ${ERROR_FIELD}
            }
        }
    }
`;

export const DELETE_FORM = /* GraphQL */ `
    mutation DeleteForm($id: ID!) {
        formBuilder {
            deleteForm(id: $id) {
                data
                error ${ERROR_FIELD}
            }
        }
    }
`;

export const DELETE_REVISION = /* GraphQL */ `
    mutation DeleteRevision($id: ID!) {
        formBuilder {
            deleteRevision(id: $id) {
                data
                error ${ERROR_FIELD}
            }
        }
    }
`;

export const SAVE_FORM_VIEW = /* GraphQL */ `
    mutation SaveFormView($id: ID!) {
        formBuilder {
            saveFormView(id: $id) {
                error ${ERROR_FIELD}
            }
        }
    }
`;

export const GET_FORM = /* GraphQL */ `
    query getForm($id: ID, $where: JSON, $sort: String) {
        formBuilder {
            getForm(id: $id, where: $where, sort: $sort) {
                data ${DATA_FIELD}
                error ${ERROR_FIELD}
            }
        }
    }
`;

export const GET_PUBLISHED_FORM = /* GraphQL */ `
    query getPublishedForm($id: ID, $parent: ID, $slug: String, $version: Int) {
        formBuilder {
            getPublishedForm(id: $id, parent: $parent, slug: $slug, version: $version) {
                data ${DATA_FIELD}
                error ${ERROR_FIELD}
            }
        }
    }
`;

export const LIST_FORMS = /* GraphQL */ `
    query ListForms(
        $sort: ListFormsSortInput,
        $search: String,
        $parent: String,
        $limit: Int,
        $after: String,
        $before: String
    ) {
        formBuilder {
            listForms(
                sort: $sort,
                search: $search,
                parent: $parent,
                limit: $limit,
                after: $after,
                before: $before
                ) {
                data ${DATA_FIELD}
                error ${ERROR_FIELD}
            }
        }
    }
`;

export const LIST_PUBLISHED_FORMS = /* GraphQL */ `
    query ListPublishedForms(
        $search: String,
        $id: ID,
        $parent: ID,
        $slug: String,
        $version: Int,
        $tags: [String],
        $sort: FormSortInput,
        $limit: Int,
        $after: String,
        $before: String
    ) {
        formBuilder {
            listPublishedForms(
                search: $search,
                id: $id,
                parent: $parent,
                slug: $slug,
                version: $version,
                tags: $tags,
                sort: $sort,
                limit: $limit,
                after: $after,
                before: $before
                ) {
                data ${DATA_FIELD}
                error ${ERROR_FIELD}
            }
        }
    }
`;

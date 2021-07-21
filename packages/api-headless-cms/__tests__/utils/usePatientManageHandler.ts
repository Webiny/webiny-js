import { useContentGqlHandler } from "./useContentGqlHandler";
import { GQLHandlerCallableArgs } from "./useGqlHandler";
import { Plugin } from "@webiny/plugins/types";

const patientFields = `
    id
    createdOn
    createdBy {
        id
        displayName
        type
    }
    savedOn
    meta {
        title
        version
        locked
        publishedOn
        status
        revisions {
            id
            name
            bio
        }
    }
    # user defined fields
    name
    bio
    prescription
`;

const errorFields = `
    error {
        code
        message
        data
    }
`;

const getPatientQuery = /* GraphQL */ `
    query GetPatient($revision: ID!) {
        getPatient(revision: $revision) {
            data {
                ${patientFields}
            }
            ${errorFields}
        }
    }
`;

const getPatientsByIdsQuery = /* GraphQL */ `
    query GetPatients($revisions: [ID!]!) {
        getPatientsByIds(revisions: $revisions) {
            data {
                ${patientFields}
            }
            ${errorFields}
        }
    }
`;

const listPatientsQuery = /* GraphQL */ `
    query ListPatients(
        $where: PatientListWhereInput
        $sort: [PatientListSorter]
        $limit: Int
        $after: String
    ) {
        listPatients(where: $where, sort: $sort, limit: $limit, after: $after) {
            data {
                ${patientFields}
            }
            meta {
                cursor
                hasMoreItems
                totalCount
            }
            ${errorFields}
        }
    }
`;

const createPatientMutation = /* GraphQL */ `
    mutation CreatePatient($data: PatientInput!) {
        createPatient(data: $data) {
            data {
                ${patientFields}
            }
            ${errorFields}
        }
    }
`;

const createPatientFromMutation = /* GraphQL */ `
    mutation CreatePatientFrom($revision: ID!) {
        createPatientFrom(revision: $revision) {
            data {
                ${patientFields}
            }
            ${errorFields}
        }
    }
`;

const updatePatientMutation = /* GraphQL */ `
    mutation UpdatePatient($revision: ID!, $data: PatientInput!) {
        updatePatient(revision: $revision, data: $data) {
            data {
                ${patientFields}
            }
            ${errorFields}
        }
    }
`;

const deletePatientMutation = /* GraphQL */ `
    mutation DeletePatient($revision: ID!) {
        deletePatient(revision: $revision) {
            data
            ${errorFields}
        }
    }
`;

const publishPatientMutation = /* GraphQL */ `
    mutation PublishPatient($revision: ID!) {
        publishPatient(revision: $revision) {
            data {
                ${patientFields}
            }
            ${errorFields}
        }
    }
`;

const unpublishPatientMutation = /* GraphQL */ `
    mutation UnpublishPatient($revision: ID!) {
        unpublishPatient(revision: $revision) {
            data {
                ${patientFields}
            }
            ${errorFields}
        }
    }
`;

const requestPatientChangesMutation = /* GraphQL */ `
    mutation RequestPatientChanges($revision: ID!) {
        requestPatientChanges(revision: $revision) {
            data {
                ${patientFields}
            }
            ${errorFields}
        }
    }
`;

const requestPatientReviewMutation = /* GraphQL */ `
    mutation RequestPatientReview($revision: ID!) {
        requestPatientReview(revision: $revision) {
            data {
                ${patientFields}
            }
            ${errorFields}
        }
    }
`;

export const usePatientManageHandler = (
    options: GQLHandlerCallableArgs,
    plugins: Plugin[] = []
) => {
    const contentHandler = useContentGqlHandler(options, plugins);

    return {
        ...contentHandler,
        async getPatient(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: { query: getPatientQuery, variables },
                headers
            });
        },
        async getPatientsByIds(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: { query: getPatientsByIdsQuery, variables },
                headers
            });
        },
        async listPatients(variables = {}, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: { query: listPatientsQuery, variables },
                headers
            });
        },
        async createPatient(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: { query: createPatientMutation, variables },
                headers
            });
        },
        async createPatientFrom(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: { query: createPatientFromMutation, variables },
                headers
            });
        },
        async updatePatient(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: {
                    query: updatePatientMutation,
                    variables
                },
                headers
            });
        },
        async deletePatient(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: {
                    query: deletePatientMutation,
                    variables
                },
                headers
            });
        },
        async publishPatient(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: {
                    query: publishPatientMutation,
                    variables
                },
                headers
            });
        },
        async unpublishPatient(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: {
                    query: unpublishPatientMutation,
                    variables
                },
                headers
            });
        },
        async requestPatientChanges(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: {
                    query: requestPatientChangesMutation,
                    variables
                },
                headers
            });
        },
        async requestPatientReview(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: {
                    query: requestPatientReviewMutation,
                    variables
                },
                headers
            });
        }
    };
};

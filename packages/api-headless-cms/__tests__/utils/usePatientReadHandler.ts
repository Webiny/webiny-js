import { useContentGqlHandler } from "./useContentGqlHandler";
import { GQLHandlerCallableArgs } from "./useGqlHandler";

const categoryFields = `
    id
    createdOn
    savedOn
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
    query GetPatient($where: PatientGetWhereInput!) {
        getPatient(where: $where) {
            data {
                ${categoryFields}
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
                id
                createdOn
                savedOn
                name
                bio
                prescription
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

export const usePatientReadHandler = (options: GQLHandlerCallableArgs) => {
    const contentHandler = useContentGqlHandler(options);

    return {
        ...contentHandler,
        async getPatient(variables, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: { query: getPatientQuery, variables },
                headers
            });
        },
        async listPatients(variables = {}, headers: Record<string, any> = {}) {
            return await contentHandler.invoke({
                body: { query: listPatientsQuery, variables },
                headers
            });
        }
    };
};

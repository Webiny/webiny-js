import { gql } from "graphql-request";

const ERROR_FIELDS = `
    code
    message
    data
`;

const BASE_CONTENT_MODEL_FIELDS = `
    description
    modelId
    name
    savedOn
    fields {
        id
    }
    group {
        id
        name
    }
`;

export const CREATE_CONTENT_MODEL = gql`
    mutation CmsCreateContentModel($data: CmsContentModelCreateInput!) {
        createContentModel(data: $data) {
            data {
                ${BASE_CONTENT_MODEL_FIELDS}
            }
            error {
                ${ERROR_FIELDS}
            }
        }
    }
`;

export const UPDATE_CONTENT_MODEL = gql`
    mutation CmsUpdateContentModel($modelId: ID!, $data: CmsContentModelUpdateInput!) {
        updateContentModel(modelId: $modelId, data: $data) {
            data {
                ${BASE_CONTENT_MODEL_FIELDS}
            }
            error {
                ${ERROR_FIELDS}
            }
        }
    }
`;

export const DELETE_CONTENT_MODEL = gql`
    mutation CmsDeleteContentModel($modelId: ID!) {
        deleteContentModel(modelId: $modelId) {
            data
            error {
                ${ERROR_FIELDS}
            }
        }
    }
`;

export const CREATE_CONTENT_MODEL_GROUP = gql`
    mutation CmsCreateContentModelGroup($data: CmsContentModelGroupInput!){
        createContentModelGroup(data: $data) {
            data {
                id
                name
            }
            error {
                ${ERROR_FIELDS}
            }
        }
    }
`;

export const DELETE_CONTENT_MODEL_GROUP = gql`
    mutation CmsDeleteContentModelGroup($id: ID!) {
        deleteContentModelGroup(id: $id) {
            data
            error {
                code
                message
            }
        }
    }
`;

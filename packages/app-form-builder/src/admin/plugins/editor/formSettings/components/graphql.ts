import gql from "graphql-tag";

const fields = /* GraphQL */ `
    {
        data {
            reCaptcha {
                enabled
                siteKey
                secretKey
            }
        }
        error {
            message
        }
    }
`;

export const GET_RECAPTCHA_SETTINGS = gql`
    query getReCaptchaSettings {
        formBuilder {
            getSettings ${fields}
        }
    }
`;

export const UPDATE_FORMS_SETTINGS = gql`
    mutation updateSettings($data: FbSettingsInput) {
        formBuilder {
            updateSettings(data: $data) ${fields}
        }
    }
`;

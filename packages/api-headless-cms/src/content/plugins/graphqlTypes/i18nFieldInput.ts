export const i18nFieldInput = (name, type) => /* GraphQL */ `
    input ${name}LocalizedInput {
        value: ${type}
        locale: ID!
    }

    input ${name}Input {
        values: [${name}LocalizedInput]
    }
    
    input ${name}ListLocalizedInput {
        value: [${type}]
        locale: ID! 
    }

    input ${name}ListInput {
        values: [${name}ListLocalizedInput]
    }
`;

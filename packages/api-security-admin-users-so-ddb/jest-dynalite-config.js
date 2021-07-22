module.exports = {
    tables: [
        {
            TableName: `Security`,
            KeySchema: [
                { AttributeName: "PK", KeyType: "HASH" },
                { AttributeName: "SK", KeyType: "RANGE" }
            ],
            AttributeDefinitions: [
                { AttributeName: "PK", AttributeType: "S" },
                { AttributeName: "SK", AttributeType: "S" },
                { AttributeName: "GSI1_PK", AttributeType: "S" },
                { AttributeName: "GSI1_SK", AttributeType: "S" }
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
            GlobalSecondaryIndexes: [
                {
                    IndexName: "GSI1",
                    KeySchema: [
                        { AttributeName: "GSI1_PK", KeyType: "HASH" },
                        { AttributeName: "GSI1_SK", KeyType: "RANGE" }
                    ],
                    Projection: {
                        ProjectionType: "ALL"
                    },
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 1,
                        WriteCapacityUnits: 1
                    }
                }
            ]
        }
    ],
    basePort: 8000
};

import Cognito from "./pulumi/cognito";
import DynamoDB from "./pulumi/dynamoDb";
import Graphql from "./pulumi/graphql";
import HeadlessCMS from "./pulumi/headlessCMS";
import ApiGateway from "./pulumi/apiGateway";
import Cloudfront from "./pulumi/cloudfront";
import ElasticSearch from "./pulumi/elasticSearch";
import FileManager from "./pulumi/fileManager";
import PageBuilder from "./pulumi/pageBuilder";
import PrerenderingService from "./pulumi/prerenderingService";

const dynamoDb = new DynamoDB();
const cognito = new Cognito();
const elasticSearch = new ElasticSearch();
const fileManager = new FileManager();

const prerenderingService = new PrerenderingService({
    env: {
        DEBUG: String(process.env.DEBUG),
        DB_TABLE: dynamoDb.table.name
    }
});

const pageBuilder = new PageBuilder({
    dbTable: dynamoDb.table
});

const api = new Graphql({
    env: {
        DEBUG: String(process.env.DEBUG),
        ELASTIC_SEARCH_ENDPOINT: elasticSearch.domain.endpoint,
        COGNITO_REGION: String(process.env.AWS_REGION),
        COGNITO_USER_POOL_ID: cognito.userPool.id,
        S3_BUCKET: fileManager.bucket.id,
        DB_TABLE: dynamoDb.table.name,
        PRERENDERING_RENDER_HANDLER: prerenderingService.functions.render.arn,
        PRERENDERING_FLUSH_HANDLER: prerenderingService.functions.flush.arn,
        PRERENDERING_QUEUE_ADD_HANDLER: prerenderingService.functions.queue.add.arn,
        PRERENDERING_QUEUE_PROCESS_HANDLER: prerenderingService.functions.queue.process.arn
    }
});

const headlessCms = new HeadlessCMS({
    dynamoDbTable: dynamoDb.table,
    env: {
        ELASTIC_SEARCH_ENDPOINT: elasticSearch.domain.endpoint,
        COGNITO_REGION: String(process.env.AWS_REGION),
        COGNITO_USER_POOL_ID: cognito.userPool.id,
        DEBUG: String(process.env.DEBUG),
        S3_BUCKET: fileManager.bucket.id
    }
});

const apiGateway = new ApiGateway({
    routes: [
        {
            name: "graphql-post",
            path: "/graphql",
            method: "POST",
            function: api.functions.api
        },
        {
            name: "graphql-options",
            path: "/graphql",
            method: "OPTIONS",
            function: api.functions.api
        },
        {
            name: "files-any",
            path: "/files/{path}",
            method: "ANY",
            function: fileManager.functions.download
        },
        {
            name: "cms-post",
            path: "/cms/{key+}",
            method: "POST",
            function: headlessCms.functions.graphql
        },
        {
            name: "cms-options",
            path: "/cms/{key+}",
            method: "OPTIONS",
            function: headlessCms.functions.graphql
        }
    ]
});

const cloudfront = new Cloudfront({ apiGateway });

export const region = process.env.AWS_REGION;
export const apiUrl = cloudfront.cloudfront.domainName.apply(value => `https://${value}`);
export const cognitoUserPoolId = cognito.userPool.id;
export const cognitoAppClientId = cognito.userPoolClient.id;
export const updatePbSettingsFunction = pageBuilder.functions.updateSettings.arn;

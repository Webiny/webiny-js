import Cognito from "./cognito";
import DynamoDB from "./dynamoDb";
import Graphql from "./graphql";
import HeadlessCMS from "./headlessCMS";
import ApiGateway from "./apiGateway";
import Cloudfront from "./cloudfront";
import FileManager from "./fileManager";
import ElasticSearch from "./elasticSearch";
import PageBuilder from "./pageBuilder";
import PrerenderingService from "./prerenderingService";
import HeadlessCMSTables from "./headlessCMSTables";

export default () => {
    const dynamoDb = new DynamoDB();
    const cognito = new Cognito();
    const elasticSearch = new ElasticSearch();
    const fileManager = new FileManager();

    const prerenderingService = new PrerenderingService({
        env: {
            DB_TABLE: dynamoDb.table.name,
            DB_TABLE_ELASTICSEARCH: elasticSearch.table.name,
            DEBUG: String(process.env.DEBUG)
        }
    });

    const pageBuilder = new PageBuilder({
        env: {
            DB_TABLE: dynamoDb.table.name,
            DB_TABLE_ELASTICSEARCH: elasticSearch.table.name,
            DEBUG: String(process.env.DEBUG)
        },
        bucket: fileManager.bucket
    });

    const headlessCmsTables = new HeadlessCMSTables(
        elasticSearch.domain,
        elasticSearch.streamTarget
    );

    const api = new Graphql({
        env: {
            COGNITO_REGION: String(process.env.AWS_REGION),
            COGNITO_USER_POOL_ID: cognito.userPool.id,
            DB_TABLE: dynamoDb.table.name,
            DB_TABLE_ELASTICSEARCH: elasticSearch.table.name,
            DB_TABLE_HEADLESS_CMS: headlessCmsTables.dataTable.name,
            DB_TABLE_HEADLESS_CMS_ELASTICSEARCH: headlessCmsTables.esTable.name,
            DEBUG: String(process.env.DEBUG),
            ELASTIC_SEARCH_ENDPOINT: elasticSearch.domain.endpoint,
            PRERENDERING_RENDER_HANDLER: prerenderingService.functions.render.arn,
            PRERENDERING_FLUSH_HANDLER: prerenderingService.functions.flush.arn,
            PRERENDERING_QUEUE_ADD_HANDLER: prerenderingService.functions.queue.add.arn,
            PRERENDERING_QUEUE_PROCESS_HANDLER: prerenderingService.functions.queue.process.arn,
            S3_BUCKET: fileManager.bucket.id
        }
    });

    const headlessCms = new HeadlessCMS({
        env: {
            COGNITO_REGION: String(process.env.AWS_REGION),
            COGNITO_USER_POOL_ID: cognito.userPool.id,
            DB_TABLE: dynamoDb.table.name,
            DB_TABLE_ELASTICSEARCH: elasticSearch.table.name,
            DB_TABLE_HEADLESS_CMS: headlessCmsTables.dataTable.name,
            DB_TABLE_HEADLESS_CMS_ELASTICSEARCH: headlessCmsTables.esTable.name,
            DEBUG: String(process.env.DEBUG),
            ELASTIC_SEARCH_ENDPOINT: elasticSearch.domain.endpoint,
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

    return {
        region: process.env.AWS_REGION,
        apiUrl: cloudfront.cloudfront.domainName.apply(value => `https://${value}`),
        cognitoUserPoolId: cognito.userPool.id,
        cognitoAppClientId: cognito.userPoolClient.id,
        mainTable: dynamoDb.table.name,
        headlessCmsDataTable: headlessCmsTables.dataTable.name,
        headlessCmsESTable: headlessCmsTables.esTable.name,
        updatePbSettingsFunction: pageBuilder.functions.updateSettings.arn
    };
};

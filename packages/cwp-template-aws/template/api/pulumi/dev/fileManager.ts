import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import policies from "./policies";

// @ts-ignore
import { getLayerArn } from "@webiny/aws-layers";

class FileManager {
    bucket: aws.s3.Bucket;
    manageS3LambdaPermission?: aws.lambda.Permission;
    bucketNotification?: aws.s3.BucketNotification;
    role: aws.iam.Role;
    functions: {
        manage: aws.lambda.Function;
        transform: aws.lambda.Function;
        download: aws.lambda.Function;
    };
    constructor() {
        this.bucket = new aws.s3.Bucket("fm-bucket", {
            acl: "private",
            forceDestroy: true,
            corsRules: [
                {
                    allowedHeaders: ["*"],
                    allowedMethods: ["POST", "GET"],
                    allowedOrigins: ["*"],
                    maxAgeSeconds: 3000
                }
            ]
        });

        const roleName = "fm-lambda-role";
        this.role = new aws.iam.Role(roleName, {
            assumeRolePolicy: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: "sts:AssumeRole",
                        Principal: {
                            Service: "lambda.amazonaws.com"
                        },
                        Effect: "Allow"
                    }
                ]
            }
        });

        const policy = policies.getFileManagerLambdaPolicy(this.bucket);

        new aws.iam.RolePolicyAttachment(`${roleName}-FileManagerLambdaPolicy`, {
            role: this.role,
            policyArn: policy.arn.apply(arn => arn)
        });

        new aws.iam.RolePolicyAttachment(`${roleName}-AWSLambdaBasicExecutionRole`, {
            role: this.role,
            policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole
        });

        const transform = new aws.lambda.Function("fm-image-transformer", {
            handler: "handler.handler",
            timeout: 30,
            runtime: "nodejs12.x",
            memorySize: 1600,
            role: this.role.arn,
            description: "Performs image optimization, resizing, etc.",
            code: new pulumi.asset.AssetArchive({
                ".": new pulumi.asset.FileArchive("../code/fileManager/transform/build")
            }),
            layers: [getLayerArn("sharp")],
            environment: {
                variables: { S3_BUCKET: this.bucket.id }
            }
        });

        const manage = new aws.lambda.Function("fm-manage", {
            role: this.role.arn,
            runtime: "nodejs12.x",
            handler: "handler.handler",
            timeout: 30,
            memorySize: 512,
            description: "Triggered when a file is deleted.",
            code: new pulumi.asset.AssetArchive({
                ".": new pulumi.asset.FileArchive("../code/fileManager/manage/build")
            }),
            environment: {
                variables: { S3_BUCKET: this.bucket.id }
            }
        });

        const download = new aws.lambda.Function("fm-download", {
            role: this.role.arn,
            runtime: "nodejs12.x",
            handler: "handler.handler",
            timeout: 30,
            memorySize: 512,
            description: "Serves previously uploaded files.",
            code: new pulumi.asset.AssetArchive({
                ".": new pulumi.asset.FileArchive("../code/fileManager/download/build")
            }),
            environment: {
                variables: {
                    S3_BUCKET: this.bucket.id,
                    IMAGE_TRANSFORMER_FUNCTION: transform.arn
                }
            }
        });

        this.functions = {
            transform,
            manage,
            download
        };

        this.manageS3LambdaPermission = new aws.lambda.Permission(
            "fm-manage-s3-lambda-permission",
            {
                action: "lambda:InvokeFunction",
                function: this.functions.manage.arn,
                principal: "s3.amazonaws.com",
                sourceArn: this.bucket.arn
            }
        );

        this.bucketNotification = new aws.s3.BucketNotification(
            "bucketNotification",
            {
                bucket: this.bucket.id,
                lambdaFunctions: [
                    {
                        lambdaFunctionArn: this.functions.manage.arn,
                        events: ["s3:ObjectRemoved:*"]
                    }
                ]
            },
            {
                dependsOn: [
                    this.bucket,
                    this.functions.manage
                ]
            }
        );
    }
}

export default FileManager;

# Product Catalog BFF Infrastructure

This repository contains the Serverless Framework configuration for the Product Catalog BFF service and its supporting infrastructure resources.

## Infrastructure Components

- **Product Catalog BFF**: Main service with REST API and event handling capabilities
- **Cognito Resources**: Authentication and user management
- **Event Hub**: EventBridge bus and Kinesis stream for event handling

## Deployment Instructions

### Prerequisites

- AWS CLI configured with appropriate credentials
- Serverless Framework installed (npm install -g serverless)
- Node.js 16.x or later

### Deployment Order

1. **Deploy Cognito Resources**:
   ```bash
   sls deploy --config serverless-cognito.yml --stage dev --region us-west-2
   ```

2. **Deploy Event Hub Resources**:
   ```bash
   sls deploy --config serverless-event-hub.yml --stage dev --region us-west-2
   ```

3. **Deploy Main Product Catalog BFF Service**:
   ```bash
   sls deploy --stage dev --region us-west-2
   export NODE_OPTIONS="--openssl-legacy-provider" && sls deploy --stage dev --region us-west-2
   ```
   
> **Note**: Always specify both `--stage` and `--region` parameters to ensure consistent resource naming and cross-stack references.

### Available Stages

The configuration supports the following stages:
- `dev` - Development environment (debug enabled, 3-day log retention)
- `np` - Non-production environment (debug enabled, 3-day log retention)  
- `prd` - Production environment (debug disabled, 30-day log retention)

### Troubleshooting

If you encounter deployment issues:

1. **ESBuild Conflict**: If you encounter "Serverless now includes ESBuild and supports Typescript out-of-the-box. But this conflicts with the plugin 'serverless-webpack'" error, ensure the `build.esbuild: false` configuration is present in your `serverless.yml` file. This disables the built-in ESBuild support to allow continued use of the webpack plugin.

2. **Permission Issues**: Ensure your AWS credentials have sufficient permissions to create resources like S3 buckets, CloudFormation stacks, Cognito User Pools, etc.

3. **Deployment Bucket**: The standalone configurations are set to use Serverless Framework's default deployment bucket creation, which should work with standard AWS permissions.

4. **Stack References**: If resources cannot be found between stacks, ensure you're deploying to the same region and using the same stage name across all deployments.

5. **Verify Exports**: After deploying the Cognito and Event Hub resources, you can verify the CloudFormation exports in the AWS Console under CloudFormation → Exports.

### Resource References

The main service references resources from the other stacks using CloudFormation outputs:

- **Cognito User Pool**: `${cf(us-west-2):${self:custom.subsys}-cognito-resources-${opt:stage}-userPoolArn}`
- **EventBridge Bus Name**: `${cf:${self:custom.subsys}-event-hub-${opt:stage}-busName}`
- **EventBridge Bus ARN**: `${cf:${self:custom.subsys}-event-hub-${opt:stage}-busArn}`
- **Kinesis Stream ARN**: `${cf:${self:custom.subsys}-event-hub-${opt:stage}-stream1Arn}`

## Local Development

For local development, use:

```bash
sls offline --stage dev
```

## Testing

Run tests with:

```bash
npm test
```

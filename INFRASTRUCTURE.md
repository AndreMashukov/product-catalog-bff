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
   ```
   
> **Note**: Always specify both `--stage` and `--region` parameters to ensure consistent resource naming and cross-stack references.

### Resource References

The main service references resources from the other stacks using CloudFormation outputs:

- **Cognito User Pool**: `${cf(us-west-2):${self:custom.subsys}-cognito-resources-${opt:stage}.userPoolArn}`
- **EventBridge Bus Name**: `${cf:${self:custom.subsys}-event-hub-${opt:stage}.busName}`
- **EventBridge Bus ARN**: `${cf:${self:custom.subsys}-event-hub-${opt:stage}.busArn}`
- **Kinesis Stream ARN**: `${cf:${self:custom.subsys}-event-hub-${opt:stage}.stream1Arn}`

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

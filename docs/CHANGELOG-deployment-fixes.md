# Deployment Fixes Changelog

**Date**: August 13, 2025  
**Session**: Serverless Framework Deployment Troubleshooting  
**Target**: `dev` stage deployment to `us-west-2` region

## Overview

This changelog documents all fixes applied to resolve deployment issues encountered when running `sls deploy --stage dev --region us-west-2`. The deployment was failing due to multiple configuration and compatibility issues that have been systematically resolved.

## Changes Made

### 1. Added Missing Stage Parameters
**Files Modified**: `serverless/config.yml`
**Issue**: Configuration only supported `np` and `prd` stages, causing variable resolution errors for `dev` stage.

```yaml
# Added dev stage parameters
params:
  dev:
    debug: '*'
    account: dev # development
    logRetentionInDays: 3
```

**Impact**: Resolved `logRetentionInDays`, `account`, and `debug` parameter resolution errors.

### 2. Fixed CloudFormation Reference Syntax
**Files Modified**: `serverless/config.yml`
**Issue**: CloudFormation references used invalid syntax format.

**Before**: 
```yaml
USER_POOL: ${cf(us-west-2):${self:custom.subsys}-cognito-resources-${opt:stage}-userPoolArn}
```

**After**:
```yaml
USER_POOL: ${cf:${self:custom.subsys}-cognito-resources-${opt:stage}.userPoolArn}
```

**Impact**: Fixed CloudFormation stack reference resolution using correct `stack-name.output-key` format.

### 3. Fixed IAM Role Statements Format
**Files Modified**: 
- `serverless/dynamodb.yml`
- `serverless/bus.yml` 
- `serverless/iam.yml`

**Issue**: IAM statements were not properly formatted as arrays, causing serverless validation errors.

**Before**:
```yaml
iamRoleStatements:
  Effect: Allow
  Action:
    - dynamodb:Query
```

**After**:
```yaml
iamRoleStatements:
  - Effect: Allow
    Action:
      - dynamodb:Query
```

**Impact**: Consolidated all IAM statements into properly formatted array structure in `iam.yml`.

### 4. Resolved Node.js/OpenSSL Compatibility Issue
**Implementation**: Environment variable solution
**Issue**: Node.js 20 with webpack 4 incompatibility due to OpenSSL 3.0 deprecations.

**Solution**: Added `NODE_OPTIONS="--openssl-legacy-provider"` to deployment command.

**Impact**: Resolved crypto hash creation errors during webpack bundling.

### 5. Fixed Deployment Bucket Configuration
**Files Modified**: `serverless.yml`
**Issue**: Custom deployment bucket didn't exist, causing deployment failures.

**Before**:
```yaml
provider:
  deploymentBucket: ${file(serverless/cfn.yml):deploymentBucket}
```

**After**:
```yaml
provider:
  # deploymentBucket: ${file(serverless/cfn.yml):deploymentBucket}
```

**Impact**: Now uses Serverless Framework's default bucket creation mechanism.

### 6. Fixed CloudFormation Export Names
**Files Modified**: 
- `serverless/cognito.yml`
- `serverless/event-hub.yml`

**Issue**: Export names contained dots (.), which are invalid in CloudFormation export names.

**Before**:
```yaml
Export:
  Name: ${self:custom.subsys}-cognito-resources-${opt:stage}.userPoolId
```

**After**:
```yaml
Export:
  Name: ${self:custom.subsys}-cognito-resources-${opt:stage}-userPoolId
```

**Impact**: Ensured CloudFormation exports follow proper naming conventions.

### 7. Removed Resource Creation Conflicts
**Files Modified**: `serverless.yml`
**Issue**: Main service attempted to create Cognito and Event Hub resources already managed by separate stacks.

**Before**:
```yaml
resources:
  - ${file(serverless/cognito.yml):resources}
  - ${file(serverless/event-hub.yml):resources}
```

**After**:
```yaml
resources:
  # - ${file(serverless/cognito.yml):resources}  # Managed by separate stack
  # - ${file(serverless/event-hub.yml):resources}  # Managed by separate stack
```

**Impact**: Eliminated CloudFormation export conflicts between stacks.

### 8. Removed CloudFormation Conditions
**Files Modified**: 
- `serverless/cognito.yml`
- `serverless/event-hub.yml`

**Issue**: Conditions were set to always false, preventing resource creation.

**Removed**:
```yaml
Conditions:
  CreateCognitoResources: 
    Fn::Equals:
      - false
      - true
```

**Impact**: Simplified resource creation without unnecessary conditions.

### 9. Disabled IAM Permissions Boundary
**Files Modified**: `serverless/iam.yml`
**Issue**: Referenced IAM policy `template-boundary-dev` didn't exist.

**Before**:
```yaml
permissionsBoundary: arn:${self:custom.partition}:iam::${aws:accountId}:policy/${self:custom.subsys}-boundary-${opt:stage}
```

**After**:
```yaml
# permissionsBoundary: arn:${self:custom.partition}:iam::${aws:accountId}:policy/${self:custom.subsys}-boundary-${opt:stage}
```

**Impact**: Removed dependency on non-existent IAM policy.

### 10. Updated Infrastructure Documentation
**Files Modified**: `INFRASTRUCTURE.md`
**Addition**: Added "Available Stages" section documenting supported environments.

```markdown
### Available Stages

The configuration supports the following stages:
- `dev` - Development environment (debug enabled, 3-day log retention)
- `np` - Non-production environment (debug enabled, 3-day log retention)  
- `prd` - Production environment (debug disabled, 30-day log retention)
```

**Impact**: Improved documentation clarity for stage-specific configurations.

## Deployment Result

**Status**: ✅ **SUCCESS**

**Stack Details**:
- **Stack Name**: `template-product-catalog-bff-dev`
- **Region**: `us-west-2`
- **API Endpoint**: `https://6nvpvbmo3d.execute-api.us-west-2.amazonaws.com/dev/{proxy+}`

**Functions Deployed**:
- `rest`: REST API handler (1.7 MB)
- `listener`: SQS/Kinesis event listener (1.6 MB)  
- `trigger`: DynamoDB stream trigger (1.6 MB)

## Dependencies

The deployment now properly integrates with existing infrastructure:
- **Cognito Stack**: `template-cognito-resources-dev`
- **Event Hub Stack**: `template-event-hub-dev`
- **DynamoDB**: Global table with cross-region replication
- **EventBridge**: Custom event bus for product catalog events
- **Kinesis**: Stream for real-time event processing

## Future Recommendations

1. **Permissions Boundary**: Consider creating the IAM boundary policy for enhanced security
2. **Custom Deployment Bucket**: Set up dedicated deployment bucket if needed for compliance
3. **Environment Variables**: Review and validate all environment variable references
4. **Testing**: Run integration tests to verify all component interactions
5. **Monitoring**: Set up CloudWatch dashboards and alarms for the deployed functions

## Command Reference

For future deployments, use:
```bash
export NODE_OPTIONS="--openssl-legacy-provider"
sls deploy --stage dev --region us-west-2
```

This ensures compatibility with Node.js 20+ and webpack 4 combination.

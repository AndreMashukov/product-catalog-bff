# Event Management for Product Catalog BFF

## Overview

The Product Catalog BFF uses an event-driven architecture for real-time updates and cross-service communication. This document provides AWS CLI commands and procedures for managing events, EventBridge, and Kinesis streams.

## ⚠️ Critical Event Structure Notes

**Recently Discovered Issues (Aug 2025)**:

### 1. Field Name Differences
Different entry points require different field names:
- **EventBridge Events**: Use `"eventType"` for routing
- **Lambda Direct Invocations**: Use `"type"` for processing

### 2. Timestamp Condition Failures
**Problem**: DynamoDB conditional check failures when using old timestamps
**Root Cause**: The system uses `ConditionExpression: "attribute_not_exists(#timestamp) OR #timestamp < :timestamp"` to prevent overwriting records with stale data
**Solution**: Always use current timestamps for testing

**Quick Fix Reference**:
```bash
# ✅ Working Lambda direct invocation with current timestamp:
aws lambda invoke \
  --function-name template-product-catalog-bff-dev-listener \
  --payload "{\"Records\":[{\"eventSource\":\"aws:sqs\",\"body\":\"{\\\"type\\\":\\\"product-published\\\",\\\"productId\\\":\\\"test-124\\\",\\\"timestamp\\\":$(date +%s)000,\\\"product\\\":{\\\"name\\\":\\\"Test Product\\\",\\\"sku\\\":\\\"TST-124\\\",\\\"price\\\":19.99}}\"}]}" \
  --cli-binary-format raw-in-base64-out \
  --region us-west-2 \
  response.json

# ❌ WRONG - Using old timestamp (will fail conditional check):
aws lambda invoke \
  --payload '{"Records":[{"eventSource":"aws:sqs","body":"{\"type\":\"product-published\",\"productId\":\"test-124\",\"timestamp\":1692097847000,..."}]}'
```

**Debugging Tips**:
1. Check DynamoDB metrics for `ConditionalCheckFailedRequests` to identify timestamp conflicts
2. Use MCP serverless tools for comprehensive diagnostics:
   ```bash
   # Get Lambda function diagnostics with error logs
   # (Replace with your actual MCP command)
   # mcp aws-lambda-info --function-names template-product-catalog-bff-dev-listener
   
   # Get DynamoDB table metrics including conditional check failures  
   # mcp aws-dynamodb-info --table-names template-product-catalog-bff-dev-entities
   ```

### Event Infrastructure

The event system consists of:
- **EventBridge**: Custom event bus for routing events (`template-bus-dev`)
- **Kinesis**: Event streams for real-time data processing (`template-stream-dev`)
- **Lambda Functions**: Event listeners and triggers for processing events

## Event Monitoring

### EventBridge Management

```bash
# List EventBridge rules
aws events list-rules \
  --event-bus-name template-bus-dev \
  --region us-west-2

# Current deployed rules:
# template-product-catalog-bff-dev-EventRule-lq1M5nJakNuC (main service rule)
# template-product-catalog-rule-dev (event hub rule)

# Get details of the main service rule
aws events describe-rule \
  --name template-product-catalog-bff-dev-EventRule-lq1M5nJakNuC \
  --event-bus-name template-bus-dev \
  --region us-west-2

# List targets for the main service rule
aws events list-targets-by-rule \
  --rule template-product-catalog-bff-dev-EventRule-lq1M5nJakNuC \
  --event-bus-name template-bus-dev \
  --region us-west-2

# Expected target output:
# {
#     "Targets": [
#         {
#             "Id": "Channel",
#             "Arn": "arn:aws:sqs:us-west-2:579273601730:template-product-catalog-bff-dev-listener",
#             "InputPath": "$.detail"
#         }
#     ]
# }

# Purge SQS queue
aws sqs purge-queue --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener --region us-west-2


# Put a test event (WORKING - includes required 'eventType' field)
aws events put-events \
  --entries '[{
    "Source": "product-catalog.test",
    "DetailType": "Product Updated",
    "Detail": "{\"eventType\":\"product-published\",\"productId\":\"test-123\",\"action\":\"update\"}",
    "EventBusName": "template-bus-dev"
  }]' \
  --region us-west-2

# Expected response:
{
    "FailedEntryCount": 0,
    "Entries": [
        {
            "EventId": "55183e79-3c3e-9214-201a-9444c5f8d8e9"
        }
    ]
}

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ) && \
UNIX_TIMESTAMP=$(date +%s)000 && \
aws events put-events \
  --entries "[{
    \"Source\": \"product-catalog.bff\",
    \"DetailType\": \"Product Published\",
    \"Detail\": \"{\\\"eventType\\\":\\\"product-published\\\",\\\"type\\\":\\\"product-published\\\",\\\"productId\\\":\\\"test-129\\\",\\\"timestamp\\\":\\\"${TIMESTAMP}\\\",\\\"product\\\":{\\\"id\\\":\\\"test-129\\\",\\\"awsregion\\\":\\\"us-west-2\\\",\\\"brand\\\":\\\"TechAudio\\\",\\\"category\\\":\\\"electronics\\\",\\\"description\\\":\\\"Premium noise-cancelling headphones\\\",\\\"name\\\":\\\"EventBridge Test Product\\\",\\\"price\\\":199.99,\\\"sku\\\":\\\"TST-129\\\",\\\"status\\\":\\\"active\\\"}}\",
    \"EventBusName\": \"template-bus-dev\"
  }]" \
  --region us-west-2

# This is what lambda recieves
{
    "Records": [
        {
            "messageId": "032b2ddf-230d-4657-a079-c70a23de2722",
            "receiptHandle": "AQEBFfVImAjj0lonNpgg5XWOPEOFGNCpUgdGg0KqV0Gijew/JkwVzrn3tjQH6srqwc60k5WK3XWtKo06hXyEbH9GPCLteeD62jyeE0AkkUWWkgq9kYLIZEp6K7gGYLooeW/SVxo86z/DZYwqfR7jxxp/wWIuttsr3wonf67qzZLsmqxzVUGTGYdt0nfxo/nkAQAgMNFVHeKfRppEMrh5ZKuMqhep6horFreMMcdN/PXD+5lxcI5A0nKVcKQLT5LwLzyR5DMWhG4VJhJ44yqphlGgYb7YAqr8yo4rw5ikEbTHataN7pCUa3QrV9qeY+nTZ4GEQuH/gWRTkBhvjdvNwpyuDOI1XoBzzY91VQXQj4vmTiFXBctj/AGX7HCsPbzZJX+tzVDUcZkJHxLCxtayBiMJELOpfzyVgCfsVabk551XCgbjJbEltNFNAVAq+MLGIpHM",
            "body": "{\"eventType\":\"product-published\",\"productId\":\"test-128\",\"timestamp\":\"2025-08-16T10:25:03Z\",\"product\":{\"id\":\"test-128\",\"awsregion\":\"us-west-2\",\"brand\":\"TechAudio\",\"category\":\"electronics\",\"description\":\"Premium noise-cancelling headphones\",\"name\":\"EventBridge Test Product\",\"price\":199.99,\"sku\":\"TST-128\",\"status\":\"active\"}}",
            "attributes": {
                "ApproximateReceiveCount": "1",
                "SentTimestamp": "1755339904760",
                "SenderId": "AIDAIE6VAXUQU2DKHA7DK",
                "ApproximateFirstReceiveTimestamp": "1755339904772"
            },
            "messageAttributes": {},
            "md5OfBody": "0944bba50a6c181bc22ac4c1cde4fc82",
            "eventSource": "aws:sqs",
            "eventSourceARN": "arn:aws:sqs:us-west-2:579273601730:template-product-catalog-bff-dev-listener",
            "awsRegion": "us-west-2"
        }
    ]
}


# Test event for product deletion
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ) && \
aws events put-events --entries '[
  {
    "Source": "product-catalog.test",
    "DetailType": "Product Deleted",
    "Detail": "{\"eventType\":\"product-deleted\",\"type\":\"product-deleted\",\"productId\":\"test-129\",\"timestamp\":\"'$TIMESTAMP'\"}",
    "EventBusName": "template-bus-dev"
  }
]' --region us-west-2



```

```bash

# 1. Check if the event reached the SQS queue
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
  --region us-west-2

# Check recent Lambda function logs (listener function)
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \
  --start-time $(date -v-10M +%s)000 \
  --limit 50 \
  --region us-west-2
```

### Kinesis Stream Management

```bash
# Describe Kinesis stream
aws kinesis describe-stream \
  --stream-name template-stream-dev \
  --region us-west-2

# List shards in the stream
aws kinesis list-shards \
  --stream-name template-stream-dev \
  --region us-west-2

# Get shard iterator
aws kinesis get-shard-iterator \
  --stream-name template-stream-dev \
  --shard-id <shard-id> \
  --shard-iterator-type LATEST \
  --region us-west-2

# Get stream records
aws kinesis get-records \
  --shard-iterator <shard-iterator> \
  --region us-west-2

# Put a record to the stream (with correct structure)
aws kinesis put-record \
  --stream-name template-stream-dev \
  --partition-key "product-123" \
  --data '{"eventType":"product-published","productId":"prod-123","timestamp":"2024-01-01T12:00:00Z"}' \
  --region us-west-2

# Put product update record
aws kinesis put-record \
  --stream-name template-stream-dev \
  --partition-key "product-456" \
  --data '{"eventType":"product-price-updated","productId":"prod-456","timestamp":"2024-01-01T12:05:00Z","changes":{"price":{"old":99.99,"new":89.99}}}' \
  --region us-west-2
```

## Event Lambda Functions

### Event Listener Function

The listener function processes both SQS messages from EventBridge and Kinesis stream records.

```bash
# Get listener function configuration
aws lambda get-function-configuration \
  --function-name template-product-catalog-bff-dev-listener \
  --region us-west-2

# View listener function logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \
  --start-time $(date -d "1 hour ago" +%s)000 \
  --region us-west-2

# Invoke listener function manually with SQS event (from EventBridge)
# ⚠️  IMPORTANT: Use "type" field for Lambda direct invocations, not "eventType"
# ⚠️  CRITICAL: Use current timestamp to avoid conditional check failures
aws lambda invoke \
  --function-name template-product-catalog-bff-dev-listener \
  --payload "{\"Records\":[{\"eventSource\":\"aws:sqs\",\"body\":\"{\\\"type\\\":\\\"product-published\\\",\\\"productId\\\":\\\"test-125\\\",\\\"timestamp\\\":$(date +%s)000}\"}]}" \
  --cli-binary-format raw-in-base64-out \
  --region us-west-2 \
  response.json

# Enhanced payload with product data for complete DynamoDB record creation
aws lambda invoke \
  --function-name template-product-catalog-bff-dev-listener \
  --payload "{\"Records\":[{\"eventSource\":\"aws:sqs\",\"body\":\"{\\\"type\\\":\\\"product-published\\\",\\\"productId\\\":\\\"test-124\\\",\\\"timestamp\\\":$(date +%s)000,\\\"product\\\":{\\\"name\\\":\\\"Test Product\\\",\\\"sku\\\":\\\"TST-124\\\",\\\"price\\\":19.99}}\"}]}" \
  --cli-binary-format raw-in-base64-out \
  --region us-west-2 \
  response.json

# Alternative: Using file-based payload with current timestamp
echo "{\"Records\":[{\"eventSource\":\"aws:sqs\",\"body\":\"{\\\"type\\\":\\\"product-published\\\",\\\"productId\\\":\\\"test-124\\\",\\\"timestamp\\\":$(date +%s)000}\"}]}" > sqs-test-payload.json
aws lambda invoke \
  --function-name template-product-catalog-bff-dev-listener \
  --payload file://sqs-test-payload.json \
  --region us-west-2 \
  response.json

# Invoke listener function manually with Kinesis event
aws lambda invoke \
  --function-name template-product-catalog-bff-dev-listener \
  --payload '{"Records":[{"eventSource":"aws:kinesis","eventName":"aws:kinesis:record","kinesis":{"data":"eyJldmVudFR5cGUiOiJwcm9kdWN0LXB1Ymxpc2hlZCIsInByb2R1Y3RJZCI6InRlc3QtMTIzIn0="}}]}' \
  --cli-binary-format raw-in-base64-out \
  --region us-west-2 \
  response.json
```

### Event Trigger Function

The trigger function processes DynamoDB stream events.

```bash
# Get trigger function configuration
aws lambda get-function-configuration \
  --function-name template-product-catalog-bff-dev-trigger \
  --region us-west-2

# View trigger function logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-trigger" \
  --start-time $(date -d "1 hour ago" +%s)000 \
  --region us-west-2

# Invoke trigger function manually with DynamoDB stream event
aws lambda invoke \
  --function-name template-product-catalog-bff-dev-trigger \
  --payload '{"Records":[{"eventSource":"aws:dynamodb","eventName":"INSERT","dynamodb":{"Keys":{"pk":{"S":"prod-123"},"sk":{"S":"product"}},"NewImage":{"pk":{"S":"prod-123"},"sk":{"S":"product"},"name":{"S":"Test Product"}}}}]}' \
  --cli-binary-format raw-in-base64-out \
  --region us-west-2 \
  response.json

# Alternative: Using file-based payload
echo '{"Records":[{"eventSource":"aws:dynamodb","eventName":"INSERT","dynamodb":{"Keys":{"pk":{"S":"prod-123"},"sk":{"S":"product"}},"NewImage":{"pk":{"S":"prod-123"},"sk":{"S":"product"},"name":{"S":"Test Product"}}}}]}' > dynamodb-test-payload.json
aws lambda invoke \
  --function-name template-product-catalog-bff-dev-trigger \
  --payload file://dynamodb-test-payload.json \
  --region us-west-2 \
  response.json
```

## Event Troubleshooting

### Debugging Event Flow

```bash
# Check EventBridge metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Events \
  --metric-name SuccessfulInvocations \
  --dimensions Name=RuleName,Value=<rule-name> \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum \
  --region us-west-2

# Check Kinesis metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Kinesis \
  --metric-name IncomingRecords \
  --dimensions Name=StreamName,Value=template-stream-dev \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum \
  --region us-west-2

# Check for failed events
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \
  --filter-pattern "ERROR" \
  --start-time $(date -d "24 hours ago" +%s)000 \
  --region us-west-2

# Check DLQ (Dead Letter Queue) messages if configured
aws sqs receive-message \
  --queue-url <dlq-url> \
  --region us-west-2
```

### Event Schema Validation

```bash
# Create event schema registry (if not exists)
aws schemas create-registry \
  --registry-name ProductCatalogEvents \
  --description "Event schemas for Product Catalog BFF" \
  --region us-west-2

# Put schema for product events
aws schemas put-code-binding \
  --registry-name ProductCatalogEvents \
  --schema-name ProductEvent \
  --language TypeScript \
  --region us-west-2
```

## Environment-Specific Event Commands

Replace `dev` with `np` (non-production) or `prd` (production) for different environments:

```bash
# Development environment
STAGE="dev"
EVENT_BUS="template-bus-dev"
STREAM_NAME="template-stream-dev"
SQS_QUEUE_NAME="template-product-catalog-bff-dev-listener"
LAMBDA_PREFIX="template-product-catalog-bff-dev"
DYNAMO_TABLE="template-product-catalog-bff-dev-entities"

# Non-production environment  
STAGE="np"
EVENT_BUS="template-bus-np"
STREAM_NAME="template-stream-np"
SQS_QUEUE_NAME="template-product-catalog-bff-np-listener"
LAMBDA_PREFIX="template-product-catalog-bff-np"
DYNAMO_TABLE="template-product-catalog-bff-np-entities"

# Production environment
STAGE="prd"
EVENT_BUS="template-bus-prd"
STREAM_NAME="template-stream-prd"
SQS_QUEUE_NAME="template-product-catalog-bff-prd-listener"
LAMBDA_PREFIX="template-product-catalog-bff-prd"
DYNAMO_TABLE="template-product-catalog-bff-prd-entities"

# Example commands with environment variables
aws events list-rules \
  --event-bus-name $EVENT_BUS \
  --region us-west-2

# Check SQS queue for specific environment
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/$SQS_QUEUE_NAME \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
  --region us-west-2

# Check Lambda logs for specific environment
aws logs filter-log-events \
  --log-group-name "/aws/lambda/${LAMBDA_PREFIX}-listener" \
  --start-time $(date -d "1 hour ago" +%s)000 \
  --region us-west-2
```

## Event Monitoring Scripts

### Event Stream Monitor Script

```bash
#!/bin/bash

# Event stream monitor
# Usage: ./monitor-events.sh

STAGE="dev"
STREAM_NAME="template-stream-$STAGE"
REGION="us-west-2"

echo "Monitoring events for $STREAM_NAME..."

# Get shard iterator
SHARD_ID=$(aws kinesis list-shards \
  --stream-name $STREAM_NAME \
  --region $REGION \
  --query "Shards[0].ShardId" \
  --output text)

SHARD_ITERATOR=$(aws kinesis get-shard-iterator \
  --stream-name $STREAM_NAME \
  --shard-id $SHARD_ID \
  --shard-iterator-type LATEST \
  --region $REGION \
  --query "ShardIterator" \
  --output text)

# Monitor for new records
while true; do
  RECORDS=$(aws kinesis get-records \
    --shard-iterator $SHARD_ITERATOR \
    --region $REGION)
  
  # Check if there are new records
  RECORD_COUNT=$(echo $RECORDS | jq '.Records | length')
  
  if [ $RECORD_COUNT -gt 0 ]; then
    echo "New events received at $(date):"
    echo $RECORDS | jq '.Records[].Data' | base64 -d
    echo "---"
  fi
  
  # Get next shard iterator
  SHARD_ITERATOR=$(echo $RECORDS | jq -r '.NextShardIterator')
  
  sleep 5
done
```

### Event Health Check Script

```bash
#!/bin/bash

# Event system health check
STAGE="dev"
REGION="us-west-2"

echo "Checking event system health for stage: $STAGE"

# Check EventBridge bus
aws events describe-event-bus \
  --name template-bus-$STAGE \
  --region $REGION > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✓ EventBridge bus is accessible"
else
  echo "✗ EventBridge bus is not accessible"
fi

# Check Kinesis stream
STREAM_STATUS=$(aws kinesis describe-stream \
  --stream-name template-stream-$STAGE \
  --region $REGION \
  --query "StreamDescription.StreamStatus" \
  --output text 2>/dev/null)

if [ "$STREAM_STATUS" = "ACTIVE" ]; then
  echo "✓ Kinesis stream is active"
else
  echo "✗ Kinesis stream is not active (status: $STREAM_STATUS)"
fi

# Check Lambda functions
for func in listener trigger rest; do
  aws lambda get-function-configuration \
    --function-name template-product-catalog-bff-$STAGE-$func \
    --region $REGION > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "✓ Lambda function $func is accessible"
  else
    echo "✗ Lambda function $func is not accessible"
  fi
done

# Check SQS queue
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-$STAGE-listener \
  --attribute-names QueueArn \
  --region $REGION > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✓ SQS queue is accessible"
else
  echo "✗ SQS queue is not accessible"
fi

# Check DynamoDB table
aws dynamodb describe-table \
  --table-name template-product-catalog-bff-$STAGE-entities \
  --region $REGION > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✓ DynamoDB table is accessible"
else
  echo "✗ DynamoDB table is not accessible"
fi

echo "Health check complete"
```

## Event Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: Lambda Not Triggered by EventBridge Events
**Problem**: Events are successfully sent to EventBridge but lambda function is not being triggered.

**Root Cause**: Event structure doesn't match the EventBridge rule pattern.

**Solution**: Ensure events include the required `eventType` field with prefix `"product-"`:

```bash
# ❌ WRONG - This won't trigger the lambda:
aws events put-events \
  --entries '[{
    "Source": "product-catalog.test",
    "DetailType": "Product Updated",
    "Detail": "{\"productId\":\"test-123\",\"action\":\"update\"}",
    "EventBusName": "template-bus-dev"
  }]' \
  --region us-west-2

# ✅ CORRECT - This will trigger the lambda:
aws events put-events \
  --entries '[{
    "Source": "product-catalog.test",
    "DetailType": "Product Updated", 
    "Detail": "{\"eventType\":\"product-published\",\"productId\":\"test-123\",\"action\":\"update\"}",
    "EventBusName": "template-bus-dev"
  }]' \
  --region us-west-2
```

**Verification Steps**:
1. Check if event reached SQS queue:
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
  --region us-west-2
```

2. Check listener lambda logs:
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \
  --start-time $(($(date +%s) - 600))000 \
  --region us-west-2
```

3. Check for DLQ messages if configured:
```bash
aws sqs receive-message \
  --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener-dlq \
  --region us-west-2
```

#### Issue 2: Events Not Matching Expected Patterns
**Problem**: Lambda receives events but doesn't process them as expected.

**Check the listener rules**:
- `m1`: Matches `/product-(draft|published|deactivated|out-of-stock|discontinued|deleted)/`
- `m2`: Matches `/product-inventory-updated/`  
- `m3`: Matches `/product-price-updated/`

**Ensure your event types follow these patterns**:
```json
{
  "eventType": "product-published", // This will match rule m1
  "productId": "test-123"
}
```

#### Issue 3: Lambda Direct Invocation vs EventBridge Events
**Problem**: Lambda function runs successfully but doesn't create DynamoDB records when invoked directly.

**Root Cause**: Field name mismatch between EventBridge events and Lambda processing.

**Key Difference**:
- **EventBridge Events**: Use `"eventType"` field (for routing/filtering)
- **Lambda Processing**: Expects `"type"` field (for aws-lambda-stream processing)

**Solution**:
```bash
# ❌ WRONG - Lambda direct invocation with "eventType" (doesn't create records):
aws lambda invoke \
  --payload '{"Records":[{"eventSource":"aws:sqs","body":"{\"eventType\":\"product-published\",\"productId\":\"test-125\"}"}]}' \
  ...

# ✅ CORRECT - Lambda direct invocation with "type" (creates records):
aws lambda invoke \
  --payload '{"Records":[{"eventSource":"aws:sqs","body":"{\"type\":\"product-published\",\"productId\":\"test-124\",\"timestamp\":1692097847000}"}]}' \
  ...
```

**Verification**:
```bash
# Check if DynamoDB record was created
aws dynamodb scan \
  --table-name template-product-catalog-bff-dev-entities \
  --region us-west-2 \
  --limit 10

# Check for conditional check failures in DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConditionalCheckFailedRequests \
  --dimensions Name=TableName,Value=template-product-catalog-bff-dev-entities \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum \
  --region us-west-2
```

#### Issue 4: DynamoDB Conditional Check Failures
**Problem**: Lambda function runs successfully but DynamoDB record is not created/updated.

**Symptoms**:
- Lambda logs show successful event processing and `updateResponse` 
- DynamoDB `ItemCount` remains unchanged
- DynamoDB metrics show `ConditionalCheckFailedRequests > 0`

**Root Cause**: 
The system uses timestamp-based conditional expressions to prevent overwriting records with stale data:
```javascript
ConditionExpression: "attribute_not_exists(#timestamp) OR #timestamp < :timestamp"
```

**Common Scenarios**:
1. **Testing with old timestamps**: Using hardcoded old timestamps (e.g., `1692097847000`)
2. **Replay attacks**: Attempting to replay old events
3. **Clock synchronization**: Events arriving out of order

**Solution**:
```bash
# ✅ Use current timestamp for testing
CURRENT_TS=$(date +%s)000
aws lambda invoke \
  --payload "{\"Records\":[{\"eventSource\":\"aws:sqs\",\"body\":\"{\\\"type\\\":\\\"product-published\\\",\\\"productId\\\":\\\"test-${CURRENT_TS}\\\",\\\"timestamp\\\":${CURRENT_TS},...\"}]}"

# ✅ Use unique product IDs to avoid conflicts  
UNIQUE_ID="test-$(date +%s)"

# ✅ Example with consistent naming (test-124 series)
aws lambda invoke \
  --payload "{\"Records\":[{\"eventSource\":\"aws:sqs\",\"body\":\"{\\\"type\\\":\\\"product-published\\\",\\\"productId\\\":\\\"test-124\\\",\\\"timestamp\\\":$(date +%s)000,\\\"product\\\":{\\\"name\\\":\\\"Test Product\\\",\\\"sku\\\":\\\"TST-124\\\",\\\"price\\\":19.99}}\"}]}"
```

**Debugging Steps**:
1. Check DynamoDB conditional check failures:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConditionalCheckFailedRequests \
  --dimensions Name=TableName,Value=template-product-catalog-bff-dev-entities \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 --statistics Sum --region us-west-2
```

2. Check existing record timestamps:
```bash
aws dynamodb get-item \
  --table-name template-product-catalog-bff-dev-entities \
  --key '{"pk":{"S":"your-product-id"},"sk":{"S":"product"}}' \
  --region us-west-2
```

#### Issue 5: EventBridge Rule Configuration
**Current Active Rule**: `template-product-catalog-bff-dev-EventRule-lq1M5nJakNuC`
- Pattern: `{"detail":{"eventType":[{"prefix":"product-"}]}}`
- Target: SQS Queue (`template-product-catalog-bff-dev-listener`) → Lambda

**Alternative Rule**: `template-product-catalog-rule-dev`  
- Pattern: `{"detail-type":["ProductCreated","ProductUpdated","ProductDeleted",...], "source":["product-catalog"]}`
- Target: **None configured** (this is why it doesn't work by itself)

**Resource Configuration Summary**:
- **EventBridge Bus**: `template-bus-dev`
- **Kinesis Stream**: `template-stream-dev`
- **SQS Queue**: `template-product-catalog-bff-dev-listener`
- **DynamoDB Table**: `template-product-catalog-bff-dev-entities`
- **Lambda Functions**: 
  - `template-product-catalog-bff-dev-listener` (processes SQS and Kinesis events)
  - `template-product-catalog-bff-dev-trigger` (processes DynamoDB stream events)
  - `template-product-catalog-bff-dev-rest` (REST API handler)

## Event Structure Reference

### Important: EventBridge vs Lambda Event Formats

**🔍 Key Insight**: The system uses different field names depending on the entry point:

| Entry Point | Field Name | Purpose | Example |
|-------------|------------|---------|---------|
| **EventBridge** | `eventType` | Event routing/filtering | `{"eventType": "product-published"}` |
| **Lambda Direct** | `type` | Event processing | `{"type": "product-published"}` |

**Why the difference?**
- EventBridge rules use `eventType` for pattern matching and routing
- The `aws-lambda-stream` library expects `type` for internal processing
- When events come through EventBridge → SQS → Lambda, the transformation happens automatically
- When invoking Lambda directly, you must use the `type` field

## Common Event Patterns

### Product Event Examples

**For EventBridge Events** (include `eventType` field with `product-` prefix):

```json
// Product Created Event
{
  "eventType": "product-published",
  "productId": "prod-123", 
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "name": "New Product",
    "sku": "SKU-123", 
    "price": 99.99
  }
}

// Product Updated Event  
{
  "eventType": "product-draft",
  "productId": "prod-123",
  "timestamp": "2024-01-01T12:05:00Z", 
  "changes": {
    "price": {
      "old": 99.99,
      "new": 89.99
    }
  }
}

// Product Inventory Updated Event
{
  "eventType": "product-inventory-updated",
  "productId": "prod-123",
  "timestamp": "2024-01-01T12:07:00Z",
  "inventory": {
    "old": 50,
    "new": 25
  }
}

// Product Price Updated Event
{
  "eventType": "product-price-updated", 
  "productId": "prod-123",
  "timestamp": "2024-01-01T12:08:00Z",
  "price": {
    "old": 99.99,
    "new": 89.99
  }
}

// Product Deleted Event
{
  "eventType": "product-deleted",
  "productId": "prod-123",
  "timestamp": "2024-01-01T12:10:00Z"
}
```

**For Lambda Direct Invocations** (use `type` field instead of `eventType`):

```json
// Product Published Event (Lambda Direct)
{
  "type": "product-published",
  "productId": "test-124",
  "timestamp": 1755332700000, // ⚠️ Use current timestamp: $(date +%s)000
  "product": {
    "name": "Test Product",
    "sku": "TST-124", 
    "price": 19.99,
    "category": "electronics"
  }
}

// Product Updated Event (Lambda Direct)
{
  "type": "product-draft",
  "productId": "prod-456", 
  "timestamp": 1755332700000, // ⚠️ Use current timestamp: $(date +%s)000
  "product": {
    "name": "Updated Product",
    "price": 89.99
  }
}

// Product Inventory Updated Event (Lambda Direct)
{
  "type": "product-inventory-updated",
  "productId": "prod-789",
  "timestamp": 1755332700000, // ⚠️ Use current timestamp: $(date +%s)000
  "inventory": {
    "old": 50,
    "new": 25
  }
}
```

**Event Types That Match Listener Rules**:
- **Rule m1**: `product-draft`, `product-published`, `product-deactivated`, `product-out-of-stock`, `product-discontinued`, `product-deleted`
- **Rule m2**: `product-inventory-updated`
- **Rule m3**: `product-price-updated`

**Complete EventBridge Test Commands**:

```bash
# Test product published event (matches rule m1)
aws events put-events \
  --entries '[{
    "Source": "product-catalog",
    "DetailType": "Product Published",
    "Detail": "{\"eventType\":\"product-published\",\"productId\":\"prod-124\",\"name\":\"Test Product\"}",
    "EventBusName": "template-bus-dev"
  }]' \
  --region us-west-2

# Test inventory update event (matches rule m2)  
aws events put-events \
  --entries '[{
    "Source": "product-catalog",
    "DetailType": "Inventory Updated", 
    "Detail": "{\"eventType\":\"product-inventory-updated\",\"productId\":\"prod-456\",\"inventory\":{\"old\":50,\"new\":25}}",
    "EventBusName": "template-bus-dev"
  }]' \
  --region us-west-2

# Test price update event (matches rule m3)
aws events put-events \
  --entries '[{
    "Source": "product-catalog",
    "DetailType": "Price Updated",
    "Detail": "{\"eventType\":\"product-price-updated\",\"productId\":\"prod-789\",\"price\":{\"old\":99.99,\"new\":89.99}}",
    "EventBusName": "template-bus-dev"
  }]' \
  --region us-west-2
```

## Current Deployed Infrastructure (December 2024)

Based on the deployed stack `template-product-catalog-bff-dev`, the following resources are currently active:

### EventBridge Resources
- **Bus Name**: `template-bus-dev`
- **Active Rule**: `template-product-catalog-bff-dev-EventRule-lq1M5nJakNuC`
  - Pattern: `{"detail":{"eventType":[{"prefix":"product-"}]}}`
  - Target: SQS Queue → Lambda Listener

### Kinesis Resources
- **Stream Name**: `template-stream-dev`
- **Consumer**: Lambda Listener Function with batch filtering

### SQS Resources
- **Queue URL**: `https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener`
- **Queue Name**: `template-product-catalog-bff-dev-listener`

### Lambda Functions
1. **Listener Function**: `template-product-catalog-bff-dev-listener`
   - Processes SQS messages from EventBridge
   - Processes Kinesis stream records
   - Log Group: `/aws/lambda/template-product-catalog-bff-dev-listener`

2. **Trigger Function**: `template-product-catalog-bff-dev-trigger`
   - Processes DynamoDB stream events
   - Log Group: `/aws/lambda/template-product-catalog-bff-dev-trigger`

3. **REST API Function**: `template-product-catalog-bff-dev-rest`
   - Handles HTTP API requests
   - Log Group: `/aws/lambda/template-product-catalog-bff-dev-rest`

### DynamoDB Resources
- **Table Name**: `template-product-catalog-bff-dev-entities`
- **Stream**: Enabled (triggers the trigger function)

### API Gateway Resources
- **REST API ID**: `0opd09aij5`
- **Deployment**: `rb1cy8` 
- **Cognito Authorizer**: `as42pn`

### Quick Resource Verification
```bash
# Verify all current resources exist
STAGE="dev"
REGION="us-west-2"

# Check EventBridge bus
aws events describe-event-bus --name template-bus-$STAGE --region $REGION

# Check Kinesis stream  
aws kinesis describe-stream --stream-name template-stream-$STAGE --region $REGION

# Check SQS queue
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-$STAGE-listener \
  --attribute-names All --region $REGION

# Check Lambda functions
aws lambda list-functions \
  --function-version ALL \
  --region $REGION \
  --query 'Functions[?starts_with(FunctionName, `template-product-catalog-bff-'$STAGE'`)].FunctionName'

# Check DynamoDB table
aws dynamodb describe-table \
  --table-name template-product-catalog-bff-$STAGE-entities \
  --region $REGION

# Check API Gateway
aws apigateway get-rest-api --rest-api-id 0opd09aij5 --region $REGION
```

For API management and product operations, see [API.md](./API.md).

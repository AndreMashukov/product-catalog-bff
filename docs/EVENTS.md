# Event Management for Product Catalog BFF

## Overview

The Product Catalog BFF uses an event-driven architecture for real-time updates and cross-service communication. This document provides AWS CLI commands and procedures for managing events, EventBridge, and Kinesis streams.

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

# template-product-catalog-bff-dev-EventRule-pS3DbAigmcQW
# template-product-catalog-rule-dev

# Get details of a specific rule
aws events describe-rule \
  --name template-product-catalog-bff-dev-EventRule-pS3DbAigmcQW \
  --event-bus-name template-bus-dev \
  --region us-west-2

# List targets for a rule
aws events list-targets-by-rule \
  --rule template-product-catalog-bff-dev-EventRule-pS3DbAigmcQW \
  --event-bus-name template-bus-dev \
  --region us-west-2

# {
#     "Targets": [
#         {
#             "Id": "Channel",
#             "Arn": "arn:aws:sqs:us-west-2:579273601730:template-product-catalog-bff-dev-listener",
#             "InputPath": "$.detail"
#         }
#     ]
# }

# purge queue
aws aws sqs purge-queue --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener


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

# Test event for product creation 
aws events put-events \
  --entries '[{
    "Source": "product-catalog.test",
    "DetailType": "Product Created",
    "Detail": "{\"eventType\":\"product-published\",\"productId\":\"prod-001\",\"timestamp\":\"2024-01-01T12:00:00Z\",\"data\":{\"pk\":\"prod-001\",\"sk\":\"product\",\"awsregion\":\"us-west-2\",\"brand\":\"TechAudio\",\"category\":\"electronics\",\"description\":\"Premium noise-cancelling headphones with 30-hour battery life\",\"dimensions\":{\"height\":8,\"length\":20,\"width\":18},\"discriminator\":\"product\",\"images\":[\"https://example.com/headphones-1.jpg\"],\"lastModifiedBy\":\"f871a310-5051-7002-7c51-bb90ffd7a3e2\",\"name\":\"Wireless Bluetooth Headphones\",\"price\":299.99,\"sku\":\"WBH-2024-001\",\"status\":\"active\",\"stockQuantity\":100,\"tags\":[\"wireless\",\"bluetooth\",\"noise-cancelling\"],\"weight\":0.25}}",
    "EventBusName": "template-bus-dev"
  }]' \
  --region us-west-2

# Test event for product creation (standard format)
aws events put-events \
  --entries '[{
    "Source": "product-catalog.bff",
    "DetailType": "Product Published",
    "Detail": "{\"eventType\":\"product-published\",\"timestamp\":\"2024-01-01T12:00:00Z\",\"product\":{\"id\":\"prod-002\",\"awsregion\":\"us-west-2\",\"brand\":\"TechAudio\",\"category\":\"electronics\",\"description\":\"Premium noise-cancelling headphones with 30-hour battery life\",\"dimensions\":{\"height\":8,\"length\":20,\"width\":18},\"images\":[\"https://example.com/headphones-1.jpg\"],\"lastModifiedBy\":\"f871a310-5051-7002-7c51-bb90ffd7a3e2\",\"name\":\"Wireless Bluetooth Headphones Pro\",\"price\":399.99,\"sku\":\"WBH-2024-002\",\"status\":\"active\",\"stockQuantity\":50,\"tags\":[\"wireless\",\"bluetooth\",\"noise-cancelling\",\"premium\"],\"weight\":0.3}}",
    "EventBusName": "template-bus-dev"
  }]' \
  --region us-west-2

# Test event for product deletion
aws events put-events \
  --entries '[{
    "Source": "product-catalog.test", 
    "DetailType": "Product Deleted",
    "Detail": "{\"eventType\":\"product-deleted\",\"productId\":\"test-789\",\"timestamp\":\"2024-01-01T12:10:00Z\"}",
    "EventBusName": "template-bus-dev"
  }]' \
  --region us-west-2



```

```bash

# 1. Check if the event reached the SQS queue
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
  --region us-west-2

# Check recent Lambda function logs
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

# Invoke listener function manually
aws lambda invoke \
  --function-name template-product-catalog-bff-dev-listener \
  --payload '{"Records":[{"eventSource":"aws:kinesis","eventName":"aws:kinesis:record","kinesis":{"data":"eyJ0ZXN0IjoidGVzdCJ9"}}]}' \
  --region us-west-2 \
  response.json
```

### Event Trigger Function

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

# Invoke trigger function manually
aws lambda invoke \
  --function-name template-product-catalog-bff-dev-trigger \
  --payload '{"Records":[{"eventSource":"aws:dynamodb","eventName":"INSERT","dynamodb":{"Keys":{"pk":{"S":"prod-123"}}}}]}' \
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

# Non-production environment  
STAGE="np"
EVENT_BUS="template-bus-np"
STREAM_NAME="template-stream-np"

# Production environment
STAGE="prd"
EVENT_BUS="template-bus-prd"
STREAM_NAME="template-stream-prd"

# Example command with environment variables
aws events list-rules \
  --event-bus-name $EVENT_BUS \
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
for func in listener trigger; do
  aws lambda get-function-configuration \
    --function-name template-product-catalog-bff-$STAGE-$func \
    --region $REGION > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "✓ Lambda function $func is accessible"
  else
    echo "✗ Lambda function $func is not accessible"
  fi
done

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

2. Check lambda logs:
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \
  --start-time $(($(date +%s) - 600))000 \
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

#### Issue 3: EventBridge Rule Configuration
**Current Active Rule**: `template-product-catalog-bff-dev-EventRule-pS3DbAigmcQW`
- Pattern: `{"detail":{"eventType":[{"prefix":"product-"}]}}`
- Target: SQS Queue → Lambda

**Alternative Rule**: `template-product-catalog-rule-dev`  
- Pattern: `{"detail-type":["ProductCreated","ProductUpdated","ProductDeleted",...], "source":["product-catalog"]}`
- Target: **None configured** (this is why it doesn't work)

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
    "Detail": "{\"eventType\":\"product-published\",\"productId\":\"prod-123\",\"name\":\"Test Product\"}",
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

For API management and product operations, see [API.md](./API.md).

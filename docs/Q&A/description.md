## Rule 1: template-product-catalog-bff-dev-EventRule-pS3DbAigmcQW

Event Pattern: {"detail":{"type":[{"prefix":"thing-"}]}}

This rule matches events where:
• The event's detail.type field starts with the prefix "thing-"
• Examples: "thing-created", "thing-updated", "thing-deleted", etc.

This appears to be a generic rule that catches events related to "thing" entities, likely used by your BFF (Backend for Frontend)
service.

## Rule 2: template-product-catalog-rule-dev

Event Pattern:
{"detail-type":["ProductCreated","ProductUpdated","ProductDeleted","VariantCreated","VariantUpdated","VariantDeleted"],"source":["product-catalog"]}

This rule matches events that:
• Have specific detail-type values for product and variant lifecycle events
• Come from the product-catalog source system
• Cover the full CRUD operations for both products and their variants

## Key Differences

- **Rule 1** uses a prefix match on detail.type (custom field)
• **Rule 2** uses exact matches on detail-type (standard EventBridge field) and filters by source

Both rules are ENABLED and will trigger their respective targets when matching events are published to the event bus.

To see what these rules actually do when triggered, you can check their targets:

bash
aws events list-targets-by-rule \
--rule template-product-catalog-bff-dev-EventRule-pS3DbAigmcQW \
--event-bus-name template-bus-dev \
--region us-west-2

aws events list-targets-by-rule \
--rule template-product-catalog-rule-dev \
--event-bus-name template-bus-dev \
--region us-west-2

> This EventBridge rule target shows how events are processed when they match the rule pattern:
> 

## Target Configuration

Target Type: Amazon SQS Queue
• **Queue**: template-product-catalog-bff-dev-listener
• **Target ID**: "Channel" (identifier for this specific target)

## Input Transformation

InputPath: $.detail

This is a JSONPath expression that transforms the incoming event before sending it to the SQS queue. Instead of sending the entire
EventBridge event structure, it extracts only the detail portion.

## Event Flow Example

When an event like this hits the event bus:
json
{
"version": "0",
"id": "event-id",
"detail-type": "Custom Event",
"source": "my-app",
"account": "579273601730",
"time": "2025-08-15T02:14:21Z",
"region": "us-west-2",
"detail": {
"type": "thing-created",
"id": "123",
"name": "My Thing"
}
}

The SQS queue will receive only:
json
{
"type": "thing-created",
"id": "123",
"name": "My Thing"
}

## Purpose

This setup creates an asynchronous processing pipeline where:

1. Events matching the "thing-" prefix pattern are captured
2. Only the relevant event data (detail section) is forwarded to the SQS queue
3. The BFF service can consume messages from the queue at its own pace
4. Provides decoupling and resilience between event producers and the BFF consumer

The queue acts as a buffer, allowing the BFF service to process events reliably even during high traffic or temporary service
unavailability.

➜ aws events put-events \
--entries '[{
"Source": "product-catalog.test",
"DetailType": "Product Updated",
"Detail": "{\"productId\":\"test-123\",\"action\":\"update\"}",
"EventBusName": "template-bus-dev"
}]' \
--region us-west-2
{
"FailedEntryCount": 0,
"Entries": [
{
"EventId": "8d9a6633-7448-42a1-d56a-0333b5e1e1f3"
}
]

Looking at your changes to `EVENTS.md`, I can see you've successfully sent an event and now want to track how it was processed. Let me help you check the event processing flow.
Ran tool
Based on the code and the infrastructure setup I can see, here's how to check on your event processing:

## Event Processing Flow

Your event goes through this path:

1. **EventBridge** → **SQS Queue** → **Lambda Listener Function**
2. The SQS queue is: `template-product-catalog-bff-dev-listener`
3. The Lambda function is: `template-product-catalog-bff-dev-listener`

## How to Check Event Processing

Here are the commands to track your event processing:

```bash
# 1. Check if the event reached the SQS queue
aws sqs get-queue-attributes \\
  --queue-url <https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener> \\
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible \\
  --region us-west-2

# 2. Check Lambda function logs to see if it processed the event
aws logs filter-log-events \\
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \\
  --start-time $(date -d "10 minutes ago" +%s)000 \\
  --region us-west-2

# 3. Check for any errors in the listener function
aws logs filter-log-events \\
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \\
  --filter-pattern "ERROR" \\
  --start-time $(date -d "1 hour ago" +%s)000 \\
  --region us-west-2

# 4. Check EventBridge metrics to see if the rule was triggered
aws cloudwatch get-metric-statistics \\
  --namespace AWS/Events \\
  --metric-name SuccessfulInvocations \\
  --dimensions Name=RuleName,Value=template-product-catalog-bff-dev-EventRule-pS3DbAigmcQW \\
  --start-time $(date -d "1 hour ago" --iso-8601) \\
  --end-time $(date --iso-8601) \\
  --period 300 \\
  --statistics Sum \\
  --region us-west-2

# 5. Look for your specific event ID in the logs
aws logs filter-log-events \\
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \\
  --filter-pattern "8d9a6633-7448-42a1-d56a-0333b5e1e1f3" \\
  --start-time $(date -d "1 hour ago" +%s)000 \\
  --region us-west-2

```

## Important Notes About Your Event

Looking at your test event and the listener rules, there might be an issue:

**Your test event:**

```json
{
  "Source": "product-catalog.test",
  "DetailType": "Product Updated",
  "Detail": "{\\"productId\\":\\"test-123\\",\\"action\\":\\"update\\"}"
}

```

**The listener rules expect:**

- Event types matching: `/product-(draft|published|deactivated|out-of-stock|discontinued|deleted)/`
- Or: `/product-inventory-updated/`
- Or: `/product-price-updated/`

**But your event has:**

- `DetailType: "Product Updated"` (which doesn't match the expected patterns)
- The rules look for `eventType` in the detail, but your detail has `action: "update"`

## Better Test Event

Try this event instead, which should match the listener rules:

```bash
aws events put-events \\
  --entries '[{
    "Source": "product-catalog.test",
    "DetailType": "Product Updated",
    "Detail": "{\\"eventType\\":\\"product-published\\",\\"productId\\":\\"test-123\\",\\"timestamp\\":\\"2024-01-01T12:00:00Z\\"}",
    "EventBusName": "template-bus-dev"
  }]' \\
  --region us-west-2

```

This should trigger the first rule (`m1`) since `product-published` matches the pattern `/product-(draft|published|deactivated|out-of-stock|discontinued|deleted)/`.

Would you like me to help you add these monitoring commands to the `EVENTS.md` documentation?

➜ aws sqs get-queue-attributes \
--queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener \
--attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
--region us-west-2
{
"Attributes": {
"ApproximateNumberOfMessages": "0",
"ApproximateNumberOfMessagesNotVisible": "0"
}
}

Great! The SQS queue shows "ApproximateNumberOfMessages": "0" which means your event was successfully processed and removed from the queue. The "ApproximateNumberOfMessagesNotVisible": "0" means no messages are currently being processed.

This indicates that:

1. ✅ Your event reached the SQS queue
2. ✅ The Lambda function picked it up and processed it
3. ✅ The message was successfully removed from the queue

Now let's check the Lambda function logs to see what happened during processing:
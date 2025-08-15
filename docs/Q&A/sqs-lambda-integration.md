# SQS-Lambda Integration Q&A

## Q: How does Lambda process messages from SQS queues?

**A:** Lambda uses an event source mapping to poll SQS queues and invoke your function synchronously. The process works as follows:

1. **Polling**: Lambda runs a fleet of pollers that continuously poll your SQS queue
2. **Batching**: Lambda reads messages in batches (up to 10 messages by default)
3. **Invocation**: Lambda invokes your function once per batch with all messages
4. **Processing**: Your function processes the entire batch
5. **Deletion**: If successful, Lambda deletes all messages from the queue

## Q: What happens if my Lambda function fails to process a message?

**A:** SQS-Lambda integration has built-in error handling:

**Default Behavior:**
- Messages are hidden during processing (visibility timeout)
- If function fails, messages become visible again after timeout
- Messages are retried automatically
- After max retries, messages can go to a Dead Letter Queue (DLQ)

**Best Practices:**
- Make your function **idempotent** (safe to process same message multiple times)
- Configure a Dead Letter Queue for failed messages
- Use batch item failure reporting for partial batch failures

## Q: How does batching work with SQS event source mappings?

**A:** Lambda batching behavior depends on queue type and configuration:

**Standard Queues:**
- Default batch size: 10 messages
- Maximum batch size: 10 messages
- Batch window: 0-5 minutes (configurable)
- Lambda waits for batch window OR until batch size is reached

**FIFO Queues:**
- Default batch size: 10 messages
- Maximum batch size: 10 messages
- Processes messages in order by MessageGroupId
- One batch per MessageGroupId at a time

**Configuration Options:**
```json
{
  "BatchSize": 5,
  "MaximumBatchingWindowInSeconds": 30,
  "FunctionResponseTypes": ["ReportBatchItemFailures"]
}
```

## Q: What is the difference between SQS standard and FIFO queues with Lambda?

**A:** Key differences in Lambda integration:

| Feature | Standard Queue | FIFO Queue |
|---------|---------------|------------|
| **Message Order** | No guarantee | Strict ordering within MessageGroupId |
| **Delivery** | At-least-once | Exactly-once within deduplication window |
| **Throughput** | Nearly unlimited | 300 TPS (or 3000 with batching) |
| **Concurrency** | Multiple batches simultaneously | One batch per MessageGroupId |
| **Deduplication** | No | Automatic with MessageDeduplicationId |

**FIFO Example Event:**
```json
{
  "Records": [{
    "messageId": "11d6ee51-4cc7-4302-9e22-7cd8afdaadf5",
    "body": "Test message",
    "attributes": {
      "SequenceNumber": "18849496460467696128",
      "MessageGroupId": "1",
      "MessageDeduplicationId": "1"
    }
  }]
}
```

## Q: How should I handle partial batch failures?

**A:** Use batch item failure reporting to avoid reprocessing successful messages:

**Function Response with Failures:**
```json
{
  "batchItemFailures": [
    {"itemIdentifier": "message-id-1"},
    {"itemIdentifier": "message-id-3"}
  ]
}
```

**Event Source Mapping Configuration:**
```bash
aws lambda create-event-source-mapping \
  --function-name MyFunction \
  --event-source-arn arn:aws:sqs:region:account:queue-name \
  --function-response-types ReportBatchItemFailures
```

**Best Practice Code Pattern:**
```javascript
exports.handler = async (event) => {
  const failures = [];
  
  for (const record of event.Records) {
    try {
      await processMessage(record);
    } catch (error) {
      console.error(`Failed to process message ${record.messageId}:`, error);
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  
  return { batchItemFailures: failures };
};
```

## Q: What are the polling and scaling characteristics?

**A:** Lambda SQS event source mapping scaling:

**Polling Behavior:**
- Lambda maintains 5 parallel pollers per function
- Each poller can retrieve up to 10 messages
- Polling is done using SQS `ReceiveMessage` API
- Empty polls result in brief pauses before next poll

**Scaling:**
- Lambda automatically scales pollers based on queue depth
- Maximum concurrent executions limited by Lambda concurrency settings
- For FIFO queues, concurrency per MessageGroupId is 1

**Cost Considerations:**
- Charged for Lambda execution time, not polling time
- SQS charges for ReceiveMessage API calls (including empty polls)
- Consider batch window to reduce polling frequency

## Q: How do I monitor SQS-Lambda integration?

**A:** Key metrics and monitoring approaches:

**CloudWatch Metrics:**
- `ApproximateNumberOfMessages`: Messages available in queue
- `ApproximateNumberOfMessagesNotVisible`: Messages being processed
- Lambda `Duration`, `Errors`, `Throttles` metrics

**Useful Commands:**
```bash
# Check queue status
aws sqs get-queue-attributes \
  --queue-url https://sqs.region.amazonaws.com/account/queue-name \
  --attribute-names All

# Check Lambda logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/function-name" \
  --start-time $(date -d "1 hour ago" +%s)000
```

**Monitoring Best Practices:**
- Set up CloudWatch alarms for queue depth
- Monitor Lambda error rates and duration
- Track Dead Letter Queue message counts
- Use X-Ray tracing for detailed analysis

## Q: What are common troubleshooting scenarios?

**A:** Common issues and solutions:

**High Queue Depth:**
- Increase Lambda concurrency limits
- Optimize function performance
- Check for function errors causing retries

**Messages Not Being Processed:**
- Verify event source mapping is enabled
- Check Lambda function permissions
- Ensure queue visibility timeout > function timeout

**Duplicate Processing:**
- Implement idempotent function logic
- Use batch item failure reporting
- Consider switching to FIFO queue if ordering matters

**Cost Optimization:**
- Use batch windows to reduce polling
- Optimize function memory allocation
- Monitor and reduce cold starts

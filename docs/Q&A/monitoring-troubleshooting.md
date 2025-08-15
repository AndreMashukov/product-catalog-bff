# Monitoring and Troubleshooting Q&A

## Q: How do I monitor EventBridge rule performance?

**A:** EventBridge provides several CloudWatch metrics for monitoring rule performance:

**Key Metrics:**
- `SuccessfulInvocations` - Number of times a rule successfully invoked targets
- `FailedInvocations` - Number of failed target invocations
- `MatchedEvents` - Events that matched the rule pattern
- `TriggeredRules` - Number of times rules were triggered

**Monitoring Commands:**
```bash
# Check if rule is being triggered
aws cloudwatch get-metric-statistics \
  --namespace AWS/Events \
  --metric-name SuccessfulInvocations \
  --dimensions Name=RuleName,Value=template-product-catalog-bff-dev-EventRule-pS3DbAigmcQW \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum

# Check for failed invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Events \
  --metric-name FailedInvocations \
  --dimensions Name=RuleName,Value=template-product-catalog-bff-dev-EventRule-pS3DbAigmcQW \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum
```

## Q: How do I troubleshoot events not being processed?

**A:** Follow this systematic troubleshooting approach:

**Step 1: Verify Event Reached EventBridge**
```bash
# Check EventBridge logs (if enabled)
aws logs filter-log-events \
  --log-group-name "/aws/events/eventbridge" \
  --filter-pattern "event-id-from-put-events" \
  --start-time $(date -d "1 hour ago" +%s)000
```

**Step 2: Check Rule Pattern Matching**
```bash
# Test if your event matches the rule pattern
aws events test-event-pattern \
  --event-pattern '{"detail":{"type":[{"prefix":"thing-"}]}}' \
  --event '{"detail":{"type":"thing-updated","id":"123"}}'
```

**Step 3: Check SQS Queue Status**
```bash
# Check queue attributes
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener \
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible,ApproximateNumberOfMessagesDelayed

# Check for messages in Dead Letter Queue (if configured)
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/579273601730/template-product-catalog-bff-dev-listener-dlq \
  --attribute-names ApproximateNumberOfMessages
```

**Step 4: Check Lambda Function Processing**
```bash
# Check recent Lambda invocations
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \
  --start-time $(date -d "1 hour ago" +%s)000

# Look for specific event ID
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \
  --filter-pattern "8d9a6633-7448-42a1-d56a-0333b5e1e1f3"
```

## Q: What do different SQS queue metrics indicate?

**A:** SQS queue metrics provide insights into message processing:

**ApproximateNumberOfMessages:**
- `0` - All messages processed successfully ✅
- `> 0` - Messages waiting to be processed
- Consistently high - Processing bottleneck or Lambda issues

**ApproximateNumberOfMessagesNotVisible:**
- `0` - No messages currently being processed
- `> 0` - Messages being processed by Lambda
- Stuck high value - Lambda function may be hanging

**ApproximateNumberOfMessagesDelayed:**
- Messages scheduled for future delivery
- Usually `0` unless using message delay

**Interpretation Examples:**
```bash
# Healthy system
{
  "ApproximateNumberOfMessages": "0",           # No backlog
  "ApproximateNumberOfMessagesNotVisible": "0"  # No stuck processing
}

# Processing bottleneck
{
  "ApproximateNumberOfMessages": "150",         # Growing backlog
  "ApproximateNumberOfMessagesNotVisible": "10" # Active processing
}

# Stuck processing
{
  "ApproximateNumberOfMessages": "5",
  "ApproximateNumberOfMessagesNotVisible": "10" # Same for long time = problem
}
```

## Q: How do I debug Lambda function errors in the event processing pipeline?

**A:** Comprehensive Lambda debugging approach:

**1. Check Error Metrics:**
```bash
# Lambda error rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=template-product-catalog-bff-dev-listener \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum

# Lambda duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=template-product-catalog-bff-dev-listener \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Average,Maximum
```

**2. Analyze Error Logs:**
```bash
# Filter for ERROR level logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \
  --filter-pattern "ERROR" \
  --start-time $(date -d "1 hour ago" +%s)000

# Look for timeout errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \
  --filter-pattern "Task timed out" \
  --start-time $(date -d "1 hour ago" +%s)000

# Check for memory issues
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-listener" \
  --filter-pattern "out of memory" \
  --start-time $(date -d "1 hour ago" +%s)000
```

**3. Common Error Patterns:**
- **Timeout**: Function exceeds configured timeout
- **Memory**: Function runs out of allocated memory  
- **Permission**: Missing IAM permissions for downstream services
- **Parsing**: Invalid JSON or unexpected event structure
- **Database**: Connection or query errors

## Q: How do I set up effective monitoring and alerting?

**A:** Comprehensive monitoring strategy:

**CloudWatch Alarms:**
```bash
# High queue depth alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "SQS-HighMessageCount" \
  --alarm-description "Alert when message count is high" \
  --metric-name ApproximateNumberOfMessages \
  --namespace AWS/SQS \
  --statistic Average \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=QueueName,Value=template-product-catalog-bff-dev-listener \
  --evaluation-periods 2

# Lambda error rate alarm  
aws cloudwatch put-metric-alarm \
  --alarm-name "Lambda-HighErrorRate" \
  --alarm-description "Alert when Lambda error rate is high" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=template-product-catalog-bff-dev-listener \
  --evaluation-periods 1
```

**Dashboard Metrics:**
- EventBridge rule success/failure rates
- SQS queue depth and processing times
- Lambda duration, errors, and concurrent executions
- Dead letter queue message counts

**Log-based Monitoring:**
- Application-specific error patterns
- Business logic failures
- Performance bottlenecks
- Security events

## Q: What are common performance bottlenecks and how do I address them?

**A:** Common bottlenecks and solutions:

**1. Lambda Cold Starts:**
- **Problem**: High latency on function initialization
- **Solution**: Provisioned concurrency, smaller deployment packages
- **Monitoring**: Track function InitDuration metric

**2. SQS Message Backlog:**
- **Problem**: Messages accumulating in queue
- **Solution**: Increase Lambda concurrency, optimize function performance
- **Monitoring**: ApproximateNumberOfMessages trending upward

**3. Database Connection Limits:**
- **Problem**: Lambda functions exhausting database connections
- **Solution**: Connection pooling, RDS Proxy, reduce connection lifetime
- **Monitoring**: Database connection metrics and Lambda error rates

**4. EventBridge Rule Throttling:**
- **Problem**: High event volume exceeding service limits
- **Solution**: Implement backoff, split across multiple rules
- **Monitoring**: FailedInvocations metric increasing

**Performance Optimization Commands:**
```bash
# Check Lambda concurrent executions
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name ConcurrentExecutions \
  --dimensions Name=FunctionName,Value=template-product-catalog-bff-dev-listener \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Maximum

# Monitor SQS message age
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name ApproximateAgeOfOldestMessage \
  --dimensions Name=QueueName,Value=template-product-catalog-bff-dev-listener \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Maximum
```

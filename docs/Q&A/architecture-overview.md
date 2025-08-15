# Product Catalog BFF - AWS Architecture Q&A

## Q: What is the overall architecture of the Product Catalog BFF system?

**A:** The Product Catalog BFF (Backend for Frontend) implements an event-driven serverless architecture using AWS services:

```
Event Source → EventBridge → SQS → Lambda → DynamoDB
                    ↓
               Input Transformation
                    ↓  
               Event Filtering
```

**Components:**
1. **EventBridge**: Central event bus with pattern-matching rules
2. **SQS**: Message queue for reliable event delivery and buffering
3. **Lambda**: Serverless functions for event processing
4. **DynamoDB**: NoSQL database for data persistence

## Q: Why use this architecture pattern for a BFF?

**A:** This serverless event-driven pattern provides several benefits for BFF applications:

**Scalability:**
- Automatic scaling based on event volume
- No server management overhead
- Pay-per-use pricing model

**Reliability:**
- SQS provides message durability and retry capabilities
- EventBridge handles event routing reliably
- Dead letter queues for failed message handling

**Decoupling:**
- Producers and consumers are loosely coupled
- Multiple event sources can integrate easily
- Changes to one component don't affect others

**Performance:**
- Asynchronous processing improves response times
- Event batching optimizes throughput
- Local caching reduces external API calls

## Q: How does event flow work in our system?

**A:** Event processing follows this flow:

**1. Event Publishing:**
```bash
aws events put-events \
  --entries '[{
    "Source": "product-catalog",
    "DetailType": "ProductCreated", 
    "Detail": "{\"productId\":\"123\",\"eventType\":\"product-published\"}"
  }]'
```

**2. EventBridge Rule Matching:**
- Rule 1: Matches `detail.type` with prefix "thing-"
- Rule 2: Matches specific product/variant events by `detail-type` and `source`

**3. Input Transformation:**
- Original event → `$.detail` extraction
- Only event details sent to SQS (not full EventBridge metadata)

**4. SQS Queuing:**
- Messages buffered in `template-product-catalog-bff-dev-listener` queue
- Provides reliability and rate limiting

**5. Lambda Processing:**
- Function polls SQS queue for messages
- Processes events in batches (up to 10 messages)
- Updates DynamoDB based on event content

## Q: What are the key AWS service interactions and dependencies?

**A:** Service dependency map:

**EventBridge Dependencies:**
- **IAM**: Permissions to invoke SQS targets
- **SQS**: Target queue for event delivery
- **CloudWatch**: Metrics and logging

**SQS Dependencies:**
- **Lambda**: Event source mapping for message processing
- **IAM**: Lambda execution role permissions
- **Dead Letter Queue**: For failed message handling

**Lambda Dependencies:**
- **DynamoDB**: Read/write permissions for data operations
- **VPC**: If accessing resources in private subnets
- **CloudWatch Logs**: Function logging
- **X-Ray**: Distributed tracing (if enabled)

**Resource ARN Examples:**
```
EventBridge Rule: arn:aws:events:us-west-2:579273601730:rule/template-product-catalog-bff-dev-EventRule-*
SQS Queue: arn:aws:sqs:us-west-2:579273601730:template-product-catalog-bff-dev-listener
Lambda Function: arn:aws:lambda:us-west-2:579273601730:function:template-product-catalog-bff-dev-listener
DynamoDB Table: arn:aws:dynamodb:us-west-2:579273601730:table/template-product-catalog-dev
```

## Q: How does the system handle different event types?

**A:** The system uses a rule-based event processing approach:

**Event Type Classification:**
```javascript
// In listener/rules.js
const rules = [
  {
    name: 'm1',
    condition: (event) => /product-(draft|published|deactivated|out-of-stock|discontinued|deleted)/.test(event.eventType)
  },
  {
    name: 'm2', 
    condition: (event) => /product-inventory-updated/.test(event.eventType)
  },
  {
    name: 'm3',
    condition: (event) => /product-price-updated/.test(event.eventType)
  }
];
```

**Processing Logic:**
1. Lambda receives batch of events from SQS
2. Each event is evaluated against rule conditions
3. Matching events trigger specific processing workflows
4. Results are persisted to DynamoDB tables

**Event Examples:**
- `product-published` → Triggers product activation workflow
- `product-inventory-updated` → Updates stock levels
- `product-price-updated` → Updates pricing information

## Q: What are the security considerations for this architecture?

**A:** Security is implemented through multiple layers:

**IAM Roles and Policies:**
- Lambda execution role with minimal required permissions
- EventBridge service role for SQS target invocation
- Resource-based policies on SQS queues

**Network Security:**
- VPC configuration for Lambda functions (if needed)
- Security groups for database access
- Private subnets for sensitive resources

**Data Protection:**
- Encryption at rest for DynamoDB tables
- Encryption in transit for all AWS service communications
- SQS message encryption with KMS keys

**Event Validation:**
- Input validation in Lambda functions
- Event schema validation
- Malformed event handling

**Monitoring and Auditing:**
- CloudTrail for API call logging
- CloudWatch for operational metrics
- X-Ray for request tracing

## Q: How does the system handle failures and ensure reliability?

**A:** Multi-layered failure handling approach:

**EventBridge Level:**
- Rule evaluation errors logged to CloudWatch
- Failed target invocations trigger alarms
- Multiple rules provide redundancy

**SQS Level:**
- Message retention up to 14 days
- Dead letter queue for processing failures
- Configurable retry attempts

**Lambda Level:**
- Automatic retries for transient failures
- Batch item failure reporting for partial failures
- Function-level error handling and logging

**Database Level:**
- DynamoDB point-in-time recovery
- Multi-AZ deployment for high availability
- Conditional writes to prevent data corruption

**Monitoring and Alerting:**
- CloudWatch alarms for key metrics
- SNS notifications for critical failures
- Automated remediation workflows

## Q: What are the cost optimization strategies for this architecture?

**A:** Several cost optimization techniques:

**Lambda Optimization:**
- Right-size memory allocation
- Minimize cold start impact
- Optimize function package size
- Use provisioned concurrency for predictable workloads

**SQS Optimization:**
- Batch message processing
- Configure appropriate visibility timeouts
- Use long polling to reduce API calls

**EventBridge Optimization:**
- Precise event patterns to reduce unnecessary invocations
- Batch events when possible
- Monitor and optimize rule complexity

**DynamoDB Optimization:**
- On-demand billing for variable workloads
- Provisioned capacity for predictable patterns
- Use appropriate partition keys
- Implement TTL for temporary data

**General Strategies:**
- Use AWS Cost Explorer for analysis
- Implement tagging for cost allocation
- Regular review of resource utilization
- Automated scaling policies

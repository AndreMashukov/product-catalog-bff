# EventBridge Event Patterns Q&A

## Q: What is an EventBridge event pattern and how does it work?

**A:** An EventBridge event pattern defines the data EventBridge uses to determine whether to send an event to a target. Event patterns have the same structure as the events they match - an event pattern either matches an event or it doesn't.

Event patterns can match against:
- Event source (`source`)
- Event metadata (`detail-type`, `account`, `region`, etc.)
- Event detail values (custom fields within the `detail` object)

Example pattern that matches EC2 instance termination events:
```json
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Instance State-change Notification"],
  "detail": {
    "state": ["terminated"]
  }
}
```

## Q: How do the two event rules in our system differ?

**A:** Our system has two distinct EventBridge rules with different matching strategies:

**Rule 1: `template-product-catalog-bff-dev-EventRule-pS3DbAigmcQW`**
- Pattern: `{"detail":{"type":[{"prefix":"thing-"}]}}`
- Uses prefix matching on a custom `detail.type` field
- Catches any event where `detail.type` starts with "thing-" (e.g., "thing-created", "thing-updated")
- More flexible but less specific

**Rule 2: `template-product-catalog-rule-dev`**
- Pattern: `{"detail-type":["ProductCreated","ProductUpdated","ProductDeleted","VariantCreated","VariantUpdated","VariantDeleted"],"source":["product-catalog"]}`
- Uses exact matching on standard EventBridge fields
- Filters by specific event types AND source system
- More precise and follows EventBridge best practices

## Q: What are the best practices for creating event patterns?

**A:** Based on AWS documentation:

1. **Be Specific**: Create precise patterns to avoid unintended matches and infinite loops
2. **Use Standard Fields**: Prefer `detail-type` and `source` over custom fields when possible
3. **Avoid Recursive Loops**: Ensure rules don't trigger events that match the same rule
4. **Use Arrays for Multiple Values**: `"state": ["running", "stopped"]` matches either value
5. **Combine Filters**: Use multiple criteria to make patterns more specific

## Q: How does prefix matching work in event patterns?

**A:** EventBridge supports prefix matching using the `prefix` operator:

```json
{
  "detail": {
    "type": [{"prefix": "thing-"}]
  }
}
```

This matches any event where `detail.type` starts with "thing-", such as:
- "thing-created"
- "thing-updated" 
- "thing-deleted"
- "thing-inventory-changed"

## Q: What happens if an event matches multiple rules?

**A:** If an event matches multiple rules on the same event bus, EventBridge will trigger ALL matching rules. Each rule operates independently and will send the event to its configured targets. This is by design - EventBridge supports fan-out patterns where one event can trigger multiple processing workflows.

## Q: Can event patterns use wildcards or regex?

**A:** EventBridge event patterns support limited pattern matching:

**Supported:**
- Exact matching: `"state": ["running"]`
- Prefix matching: `"type": [{"prefix": "order-"}]`
- Anything-but matching: `"state": [{"anything-but": ["error"]}]`
- Numeric matching: `"price": [{"numeric": [">", 100]}]`

**Not Supported:**
- Full regex patterns
- Suffix matching
- Contains/substring matching

## Q: How can I test event patterns before deploying?

**A:** AWS provides several ways to test event patterns:

1. **EventBridge Sandbox**: Test patterns in the AWS Console
2. **AWS CLI**: Use `aws events test-event-pattern` command
3. **Local Testing**: Send test events with `aws events put-events`

Example CLI test:
```bash
aws events test-event-pattern \
  --event-pattern '{"source":["product-catalog"],"detail-type":["ProductCreated"]}' \
  --event '{"source":"product-catalog","detail-type":"ProductCreated","detail":{"id":"123"}}'
```

## Q: What are the limits for event patterns?

**A:** EventBridge event pattern limits:
- Maximum size: 2048 characters per pattern
- Maximum nesting depth: 5 levels
- Maximum array elements: 10 per array in the pattern
- Rules per event bus: 300 (can be increased via support request)

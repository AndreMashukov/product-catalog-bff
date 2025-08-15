# EventBridge Input Transformation Q&A

## Q: What is EventBridge input transformation and why is it useful?

**A:** EventBridge input transformation allows you to customize event data before it's sent to targets. Instead of sending the entire EventBridge event structure, you can:

- Extract specific fields from the event
- Reshape the data structure
- Add static values or computed fields
- Reduce payload size for targets

**Our System Example:**
- **Input Path**: `$.detail` (extracts only the detail portion)
- **Original Event**: Full EventBridge event with metadata
- **Transformed Output**: Only the detail object sent to SQS

## Q: How does JSONPath work in EventBridge input transformation?

**A:** EventBridge uses JSONPath expressions to extract data from events. Supported syntax includes:

**Basic Syntax:**
- `$.detail` - Extract the detail object
- `$.detail.productId` - Extract nested field
- `$.resources[0]` - First item from array
- `$.detail.tags[*]` - All items from array (wildcard)

**Our System Usage:**
```json
{
  "InputPath": "$.detail"
}
```

This transforms an event like:
```json
{
  "version": "0",
  "source": "product-catalog",
  "detail-type": "ProductCreated",
  "detail": {
    "productId": "123",
    "name": "Widget"
  }
}
```

Into just:
```json
{
  "productId": "123", 
  "name": "Widget"
}
```

## Q: What are the differences between Input Path and Input Template?

**A:** EventBridge supports two transformation approaches:

**Input Path (Simple):**
- Extracts a single JSONPath expression
- Our system uses: `"InputPath": "$.detail"`
- Good for extracting one object/value

**Input Template (Advanced):**
- Define variables with JSONPath
- Create custom output structure
- Combine multiple fields and static values

**Input Template Example:**
```json
{
  "InputPathsMap": {
    "productId": "$.detail.productId",
    "timestamp": "$.time",
    "source": "$.source"
  },
  "InputTemplate": {
    "id": "<productId>",
    "processedAt": "<timestamp>",
    "origin": "<source>",
    "environment": "production"
  }
}
```

## Q: What are the predefined variables available in EventBridge transformations?

**A:** EventBridge provides several reserved variables:

**Available Variables:**
- `<aws.events.rule-arn>` - ARN of the triggered rule
- `<aws.events.rule-name>` - Name of the triggered rule  
- `<aws.events.event.ingestion-time>` - When EventBridge received the event
- `<aws.events.event>` - Original event without detail field
- `<aws.events.event.json>` - Complete original event with detail

**Example Usage:**
```json
{
  "InputTemplate": {
    "data": "<aws.events.event.json>",
    "processedBy": "<aws.events.rule-name>",
    "timestamp": "<aws.events.event.ingestion-time>"
  }
}
```

## Q: How do I handle strings vs JSON objects in templates?

**A:** EventBridge automatically handles quoting based on data type:

**String Variables (Auto-quoted):**
```json
{
  "InputPathsMap": {"id": "$.detail.productId"},
  "InputTemplate": {
    "productId": "<id>",  // No quotes needed - EventBridge adds them
    "message": "Product <id> was updated"
  }
}
```

**JSON Object Variables (No quotes):**
```json
{
  "InputPathsMap": {"details": "$.detail"},
  "InputTemplate": {
    "event": <details>,  // No quotes - it's a JSON object
    "processed": true
  }
}
```

**Important Rules:**
- Don't quote variables that reference JSON objects/arrays
- EventBridge auto-quotes string values
- JSON properties like `<aws.events.event.json>` must be used as JSON field values

## Q: What are common pitfalls with input transformation?

**A:** Based on AWS documentation, common issues include:

**1. Invalid JSONPath:**
- No validation when creating templates
- Non-existent paths result in missing variables
- Test thoroughly before deployment

**2. Quoting Issues:**
- Don't manually quote JSON object variables
- String variables are auto-quoted by EventBridge
- Mixed types need careful handling

**3. Template Size Limits:**
- Maximum template size varies by target
- Large transformations may hit payload limits
- Consider multiple smaller transformations

**4. Reserved Variable Usage:**
- Variables like `<aws.events.event.json>` can only be JSON field values
- Can't be used inline in strings
- Must be properly structured

## Q: How can I test input transformations?

**A:** Several testing approaches:

**1. EventBridge Sandbox:**
- Available in AWS Console
- Test transformations with sample events
- See output before deploying

**2. AWS CLI Testing:**
```bash
# Send test event
aws events put-events \
  --entries '[{
    "Source": "test-source",
    "DetailType": "Test Event", 
    "Detail": "{\"productId\":\"123\",\"action\":\"test\"}"
  }]'

# Check target received correct format
aws sqs receive-message \
  --queue-url https://sqs.region.amazonaws.com/account/queue
```

**3. Local Development:**
- Mock EventBridge events in unit tests
- Validate transformation logic
- Test edge cases and error conditions

## Q: What are the performance considerations for input transformation?

**A:** Performance and cost impacts:

**Processing Overhead:**
- Transformations add minimal latency
- JSONPath evaluation is fast
- Template rendering scales with complexity

**Payload Size:**
- Smaller payloads reduce network transfer
- Important for high-volume event processing
- SQS has 256KB message limit

**Cost Benefits:**
- Reduced data transfer costs
- Smaller CloudWatch log entries
- More efficient target processing

**Best Practices:**
- Transform to minimum required data
- Avoid complex nested transformations
- Cache static values when possible
- Monitor transformation errors in CloudWatch

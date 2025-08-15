# Product Catalog BFF - System Architecture Diagrams

## High-Level Architecture Diagram

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Event     │───▶│ EventBridge  │───▶│     SQS     │───▶│   Lambda    │
│ Producers   │    │              │    │   Queue     │    │ Functions   │
│             │    │ ┌─────────┐  │    │             │    │             │
└─────────────┘    │ │ Rule 1  │  │    └─────────────┘    └──────┬──────┘
                   │ │ Rule 2  │  │                             │
                   │ └─────────┘  │                             │
                   └──────────────┘                             ▼
                                                        ┌─────────────┐
┌─────────────┐                                        │  DynamoDB   │
│   Frontend  │◀───────────────────────────────────────│   Tables    │
│   Clients   │                                        │             │
└─────────────┘                                        └─────────────┘
     ▲                                                          ▲
     │                                                          │
     └──────────────────── API Calls ──────────────────────────┘
```

**Description:** This diagram shows the complete event-driven architecture where external event producers send events to EventBridge. Events are filtered by rules, transformed, and sent to SQS queues. Lambda functions poll the queues, process events in batches, and update DynamoDB. Frontend clients access the processed data through API calls.

## Event Processing Flow Diagram

```
Event Source                EventBridge                 SQS Queue              Lambda Function
     │                          │                          │                       │
     │ 1. Put Event            │                          │                       │
     │────────────────────────▶│                          │                       │
     │                          │                          │                       │
     │                          │ 2. Pattern Match         │                       │
     │                          │    & Transform           │                       │
     │                          │                          │                       │
     │                          │ 3. Send to Queue        │                       │
     │                          │─────────────────────────▶│                       │
     │                          │                          │                       │
     │                          │                          │ 4. Poll Messages     │
     │                          │                          │◀──────────────────────│
     │                          │                          │                       │
     │                          │                          │ 5. Batch Processing  │
     │                          │                          │──────────────────────▶│
     │                          │                          │                       │
     │                          │                          │                       │ 6. Process & Store
     │                          │                          │                       │─────────────┐
     │                          │                          │                       │             ▼
     │                          │                          │                       │      ┌─────────────┐
     │                          │                          │ 7. Delete Messages   │      │  DynamoDB   │
     │                          │                          │◀──────────────────────│      └─────────────┘
     │                          │                          │                       │
```

**Description:** This sequence diagram illustrates the complete event processing flow from event publication to data persistence. It shows the asynchronous nature of the system and the batch processing approach used by Lambda functions.

## Database Schema and Access Patterns

```
DynamoDB Tables:

┌─────────────────────────────────────────────────────────────┐
│                    Product Table                            │
├─────────────────────────────────────────────────────────────┤
│ Partition Key: productId (String)                          │
│ Sort Key: version (Number) - Optional                      │
├─────────────────────────────────────────────────────────────┤
│ Attributes:                                                 │
│ • name (String)                                            │
│ • description (String)                                     │
│ • category (String)                                        │
│ • price (Number)                                           │
│ • inventory (Number)                                       │
│ • status (String) - draft|published|deactivated           │
│ • createdAt (String - ISO timestamp)                      │
│ • updatedAt (String - ISO timestamp)                      │
│ • eventType (String) - Last event that modified this      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Product Variant Table                     │
├─────────────────────────────────────────────────────────────┤
│ Partition Key: productId (String)                          │
│ Sort Key: variantId (String)                               │
├─────────────────────────────────────────────────────────────┤
│ Attributes:                                                 │
│ • name (String)                                            │
│ • sku (String)                                             │
│ • color (String)                                           │
│ • size (String)                                            │
│ • price (Number)                                           │
│ • inventory (Number)                                       │
│ • status (String)                                          │
│ • attributes (Map) - Flexible variant properties          │
└─────────────────────────────────────────────────────────────┘

Access Patterns:
1. Get Product by ID → Query: productId = "ABC123"
2. Get Product Variants → Query: productId = "ABC123", variantId begins_with("")
3. Get Product History → Query: productId = "ABC123" (if versioning enabled)
4. List Products by Category → GSI on category attribute
```

**Description:** The database schema uses DynamoDB's partition key design for efficient access. Products use productId as partition key for direct access, while variants use productId + variantId for hierarchical organization. Global Secondary Indexes (GSI) support additional query patterns like category-based searches.

## Component Interaction and Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AWS Services Integration                           │
└─────────────────────────────────────────────────────────────────────────────┘

EventBridge Rules                    SQS Queue                    Lambda Function
┌───────────────┐                   ┌──────────────┐              ┌─────────────────┐
│ Rule 1:       │                   │ Message      │              │ Event Processor │
│ thing-*       │──────────────────▶│ Buffer       │─────────────▶│                 │
│               │   Transform       │              │   Poll       │ ┌─────────────┐ │
│ Rule 2:       │   $.detail        │ ┌──────────┐ │   Batch      │ │   Rules     │ │
│ Product/      │                   │ │ DLQ      │ │              │ │ Processor   │ │
│ Variant       │                   │ │          │ │              │ └─────────────┘ │
│ Events        │                   │ └──────────┘ │              │                 │
└───────────────┘                   └──────────────┘              └─────────┬───────┘
        │                                   │                              │
        │                                   │                              │
        ▼                                   ▼                              ▼
┌───────────────┐                   ┌──────────────┐              ┌─────────────────┐
│ CloudWatch    │                   │ CloudWatch   │              │ CloudWatch      │
│ Metrics       │                   │ Metrics      │              │ Logs & Metrics  │
│ • Invocations │                   │ • Queue      │              │ • Duration      │
│ • Matches     │                   │   Depth      │              │ • Errors        │
│ • Failures    │                   │ • Messages   │              │ • Invocations   │
└───────────────┘                   └──────────────┘              └─────────────────┘
                                                                           │
                                                                           ▼
                                                                   ┌─────────────────┐
                                                                   │   DynamoDB      │
                                                                   │                 │
                                                                   │ • Auto Scaling  │
                                                                   │ • Metrics       │
                                                                   │ • Backups       │
                                                                   └─────────────────┘
```

**Description:** This diagram shows the dependencies and interactions between AWS services. Each component has its own monitoring and metrics, and the system is designed with loose coupling where each service can operate independently while contributing to the overall data processing pipeline.

## Scaling and Performance Characteristics

```
Performance Bottlenecks and Scaling Points:

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   EventBridge   │    │   SQS Queue     │    │     Lambda      │    │   DynamoDB      │
│                 │    │                 │    │                 │    │                 │
│ Limit:          │    │ Limit:          │    │ Limit:          │    │ Limit:          │
│ 2,400 events/  │    │ 120,000 msgs    │    │ 1,000 concurrent│    │ 40,000 RCU/WCU  │
│ sec per rule    │    │ in flight       │    │ executions      │    │ per table       │
│                 │    │                 │    │ (adjustable)    │    │ (on-demand)     │
│ Scaling:        │    │ Scaling:        │    │ Scaling:        │    │ Scaling:        │
│ • Multiple      │    │ • Dead Letter   │    │ • Reserved      │    │ • Auto Scaling  │
│   rules         │    │   Queue         │    │   Concurrency   │    │ • Global Tables │
│ • Regional      │    │ • FIFO for      │    │ • Provisioned   │    │ • Multiple      │
│   distribution  │    │   ordering      │    │   Concurrency   │    │   Tables        │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         ▼                       ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            Scaling Strategy                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Horizontal: Multiple Lambda functions processing different event types          │
│ 2. Vertical: Increase Lambda memory/CPU for faster processing                     │
│ 3. Partitioning: Shard events across multiple SQS queues                         │
│ 4. Caching: Add ElastiCache for frequently accessed data                          │
│ 5. Regional: Deploy in multiple regions for geographic distribution               │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Description:** This diagram outlines the scaling characteristics and limits of each component in the system. It shows how different scaling strategies can be applied at each layer to handle increased load, from horizontal scaling with multiple functions to geographic distribution across regions.

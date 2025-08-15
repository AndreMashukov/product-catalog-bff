# Product Catalog BFF - System Design Answers

## Q1: What is the primary architectural goal of the Product Catalog BFF system?
**Answer: 1**

To provide a unified API for multiple frontend clients while decoupling them from backend services

**Explanation:** A Backend for Frontend (BFF) pattern serves as an intermediary layer that provides tailored APIs for different frontend clients while abstracting the complexity of backend microservices. This system implements this pattern by processing product catalog events and providing a unified interface for product data access.

## Q2: Which event-driven pattern best describes the system's architecture?
**Answer: 2**

Publish-subscribe with asynchronous event processing through EventBridge and SQS

**Explanation:** The system uses EventBridge as the central event bus where producers publish events, and subscribers (Lambda functions) consume them asynchronously through SQS queues. This provides loose coupling and scalability compared to synchronous request-response patterns.

## Q3: Why does the system use both EventBridge and SQS instead of direct Lambda invocation?
**Answer: 1**

SQS provides message durability, retry logic, and decoupling while EventBridge handles event routing

**Explanation:** EventBridge excels at event routing and pattern matching, while SQS provides reliable message delivery, automatic retries, and dead letter queue capabilities. This combination ensures both flexible event routing and reliable processing.

## Q4: What is the estimated capacity the system needs to handle based on the infrastructure setup?
**Answer: 3**

10,000+ events per second with auto-scaling Lambda and DynamoDB on-demand

**Explanation:** The serverless architecture with EventBridge, SQS, auto-scaling Lambda functions, and DynamoDB on-demand billing is designed to handle high-throughput scenarios. The infrastructure components can scale automatically to support tens of thousands of events per second.

## Q5: Why was a serverless architecture chosen over containerized microservices?
**Answer: 1**

Serverless eliminates infrastructure management, provides automatic scaling, and reduces operational overhead

**Explanation:** Serverless architecture removes the need to manage servers, provides automatic scaling based on demand, and offers a pay-per-use model. For event-driven workloads with variable traffic, this reduces operational complexity and costs.

## Q6: Which communication pattern is used between EventBridge and the Lambda function?
**Answer: 2**

Asynchronous message passing through SQS with batch processing

**Explanation:** EventBridge sends events to SQS, which acts as a buffer. Lambda polls SQS for messages and processes them in batches asynchronously. This pattern provides better reliability and allows for batch processing optimization.

## Q7: What are the trade-offs of using event-driven architecture in this system?
**Answer: 1**

Higher latency but better fault tolerance and loose coupling between components

**Explanation:** Event-driven architectures introduce some latency due to asynchronous processing and queuing, but they provide superior fault tolerance, easier scaling, and loose coupling between system components, making the system more resilient and maintainable.

## Q8: Why does the EventBridge rule use input transformation with `$.detail`?
**Answer: 2**

To reduce SQS message size by sending only relevant event data instead of full EventBridge metadata

**Explanation:** Input transformation with `$.detail` extracts only the business data from events, reducing message size and processing overhead. This optimization improves performance and reduces costs by eliminating unnecessary EventBridge metadata.

## Q9: Why was DynamoDB chosen over a relational database for this system?
**Answer: 2**

DynamoDB offers automatic scaling, low latency, and fits the event-driven access patterns

**Explanation:** DynamoDB provides automatic scaling, consistent low-latency performance, and integrates well with serverless architectures. For event-driven systems with simple access patterns, it offers better performance and operational simplicity than relational databases.

## Q10: What is the appropriate sharding strategy for the product data in DynamoDB?
**Answer: 3**

Shard by productId to ensure even distribution and direct key access

**Explanation:** Using productId as the partition key ensures even distribution across DynamoDB partitions and enables efficient direct access by product identifier. This strategy aligns with the primary access pattern of retrieving products by their unique ID.

## Q11: Which caching strategy best meets the system's requirements?
**Answer: 2**

Application-level caching with TTL-based invalidation for frequently accessed products

**Explanation:** Application-level caching with TTL provides a balance between performance and data freshness. For product catalogs, this strategy reduces database load for frequently accessed items while ensuring data doesn't become stale beyond acceptable limits.

## Q12: How does the system handle EventBridge rule failures?
**Answer: 2**

Failed events trigger CloudWatch alarms and can be configured with dead letter queues

**Explanation:** EventBridge integrates with CloudWatch for monitoring and alarming on failed invocations. SQS dead letter queues can capture messages that fail processing, allowing for analysis and reprocessing of failed events.

## Q13: What happens when the SQS queue reaches its message limit?
**Answer: 1**

New messages are rejected and producers receive error responses

**Explanation:** SQS queues have message limits (default 120,000 in-flight messages). When reached, new messages are rejected with error responses. This back-pressure mechanism prevents infinite queue growth and system overload.

## Q14: Which scaling bottleneck is most likely when the system handles 50,000 events per minute?
**Answer: 3**

Lambda concurrent execution limits causing function throttling

**Explanation:** At high event volumes, Lambda concurrent execution limits become the primary bottleneck. While EventBridge and SQS can handle high throughput, Lambda concurrency limits may cause throttling, requiring careful capacity planning and reserved concurrency configuration.

## Q15: How does the system maintain data consistency between cache and database?
**Answer: 2**

Cache-aside pattern with TTL expiration and event-driven invalidation

**Explanation:** The cache-aside pattern combined with TTL ensures data freshness while the event-driven architecture allows for proactive cache invalidation when data changes. This approach balances performance with consistency requirements.

## Q16: What is the recovery strategy when DynamoDB becomes unavailable?
**Answer: 3**

Implement circuit breaker pattern with SQS dead letter queue for retry

**Explanation:** Circuit breaker patterns prevent cascade failures, while SQS dead letter queues preserve failed messages for later processing. This strategy maintains system stability during database outages and ensures no data loss.

## Q17: How does the system handle duplicate events in the processing pipeline?
**Answer: 1**

DynamoDB conditional writes and idempotent Lambda function logic

**Explanation:** Idempotent function design ensures duplicate events don't cause harmful side effects, while DynamoDB conditional writes prevent inconsistent state changes. This combination handles the "at-least-once" delivery guarantee of the messaging system.

## Q18: Which monitoring strategy provides the best visibility into system health?
**Answer: 2**

Comprehensive monitoring across EventBridge, SQS, Lambda, and DynamoDB with correlated metrics

**Explanation:** Effective monitoring requires visibility across all system components with correlated metrics to understand the complete request flow. This approach enables faster troubleshooting and better understanding of system behavior under different conditions.

## Q19: What is the impact of increasing Lambda function memory allocation from 128MB to 512MB?
**Answer: 1**

Proportional increase in cost with potential decrease in execution time and timeout errors

**Explanation:** Lambda pricing is proportional to memory allocation, but higher memory also means more CPU power, potentially reducing execution time. For I/O or CPU intensive operations, the reduced execution time may offset the increased per-millisecond cost.

## Q20: How does the system's architecture support multi-region deployment?
**Answer: 1**

EventBridge global replication with cross-region SQS and DynamoDB Global Tables

**Explanation:** Multi-region deployment requires EventBridge custom buses in each region, cross-region SQS integration for event routing, and DynamoDB Global Tables for data replication. This approach provides both regional isolation and data consistency across regions.

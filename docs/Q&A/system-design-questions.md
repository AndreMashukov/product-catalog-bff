# Product Catalog BFF - System Design Questions

## Q1: What is the primary architectural goal of the Product Catalog BFF system?
1. To provide a unified API for multiple frontend clients while decoupling them from backend services
2. To implement a microservice architecture with distributed data storage
3. To create a real-time streaming platform for product catalog updates
4. To establish a centralized authentication and authorization service

## Q2: Which event-driven pattern best describes the system's architecture?
1. Request-response with synchronous communication between all components
2. Publish-subscribe with asynchronous event processing through EventBridge and SQS
3. Message queuing with direct database writes from event producers
4. Event sourcing with complete event history stored in DynamoDB

## Q3: Why does the system use both EventBridge and SQS instead of direct Lambda invocation?
1. SQS provides message durability, retry logic, and decoupling while EventBridge handles event routing
2. EventBridge cannot directly invoke Lambda functions in this AWS region
3. SQS is required for all Lambda functions that process more than 10 events per second
4. EventBridge and SQS together provide better security than direct Lambda invocation

## Q4: What is the estimated capacity the system needs to handle based on the infrastructure setup?
1. 100 events per second with 1GB of data storage requirements
2. 1,000 events per second with basic DynamoDB provisioned capacity
3. 10,000+ events per second with auto-scaling Lambda and DynamoDB on-demand
4. 100,000+ events per second requiring custom scaling solutions

## Q5: Why was a serverless architecture chosen over containerized microservices?
1. Serverless eliminates infrastructure management, provides automatic scaling, and reduces operational overhead
2. Containerized solutions cannot handle event-driven architectures effectively
3. AWS Lambda is always more cost-effective than container solutions
4. Serverless architectures are required for EventBridge integration

## Q6: Which communication pattern is used between EventBridge and the Lambda function?
1. Synchronous HTTP requests through API Gateway for immediate processing
2. Asynchronous message passing through SQS with batch processing
3. Direct database triggers that invoke Lambda functions automatically
4. WebSocket connections for real-time bidirectional communication

## Q7: What are the trade-offs of using event-driven architecture in this system?
1. Higher latency but better fault tolerance and loose coupling between components
2. Lower latency but increased complexity in debugging and monitoring
3. Simplified development but reduced scalability and reliability
4. Better performance but higher infrastructure costs and maintenance

## Q8: Why does the EventBridge rule use input transformation with `$.detail`?
1. To comply with AWS security requirements for event processing
2. To reduce SQS message size by sending only relevant event data instead of full EventBridge metadata
3. To convert XML events to JSON format for Lambda processing
4. To encrypt sensitive data before sending to the queue

## Q9: Why was DynamoDB chosen over a relational database for this system?
1. DynamoDB provides better SQL query capabilities for complex product relationships
2. DynamoDB offers automatic scaling, low latency, and fits the event-driven access patterns
3. Relational databases cannot be integrated with Lambda functions
4. DynamoDB is required for all serverless applications on AWS

## Q10: What is the appropriate sharding strategy for the product data in DynamoDB?
1. Shard by timestamp to ensure even distribution across partitions
2. Shard by product category to group related items together
3. Shard by productId to ensure even distribution and direct key access
4. Shard by user session to optimize for user-specific queries

## Q11: Which caching strategy best meets the system's requirements?
1. Database-level caching only to reduce DynamoDB read operations
2. Application-level caching with TTL-based invalidation for frequently accessed products
3. CDN caching for all API responses regardless of data freshness requirements
4. In-memory caching within Lambda functions for session data

## Q12: How does the system handle EventBridge rule failures?
1. Failed events are automatically retried 3 times then discarded
2. Failed events trigger CloudWatch alarms and can be configured with dead letter queues
3. EventBridge rules cannot fail once they are properly configured
4. Failed events are stored in S3 for manual review and reprocessing

## Q13: What happens when the SQS queue reaches its message limit?
1. New messages are rejected and producers receive error responses
2. The oldest messages are automatically deleted to make room for new ones
3. SQS automatically scales to accommodate unlimited messages
4. EventBridge stops sending events until queue space is available

## Q14: Which scaling bottleneck is most likely when the system handles 50,000 events per minute?
1. EventBridge rule evaluation speed limiting event processing
2. SQS queue throughput restrictions preventing message delivery
3. Lambda concurrent execution limits causing function throttling
4. DynamoDB write capacity units causing database bottlenecks

## Q15: How does the system maintain data consistency between cache and database?
1. Using distributed transactions across all storage systems
2. Cache-aside pattern with TTL expiration and event-driven invalidation
3. Write-through caching with synchronous updates to both systems
4. Eventually consistent reads with manual cache refresh triggers

## Q16: What is the recovery strategy when DynamoDB becomes unavailable?
1. Switch to backup RDS instance with replicated data
2. Use Lambda environment variables to store temporary data
3. Implement circuit breaker pattern with SQS dead letter queue for retry
4. Cache all reads in Redis and continue processing without persistence

## Q17: How does the system handle duplicate events in the processing pipeline?
1. DynamoDB conditional writes and idempotent Lambda function logic
2. EventBridge automatically deduplicates all incoming events
3. SQS FIFO queues prevent all duplicate message delivery
4. Lambda functions can only process each event exactly once

## Q18: Which monitoring strategy provides the best visibility into system health?
1. Database-only monitoring focusing on DynamoDB performance metrics
2. Comprehensive monitoring across EventBridge, SQS, Lambda, and DynamoDB with correlated metrics
3. Application-level logging within Lambda functions exclusively
4. Real-time monitoring of only the most critical business KPIs

## Q19: What is the impact of increasing Lambda function memory allocation from 128MB to 512MB?
1. Proportional increase in cost with potential decrease in execution time and timeout errors
2. No change in performance but significant increase in operating costs
3. Faster execution guaranteed with no impact on cost structure
4. Memory allocation has no effect on Lambda function performance

## Q20: How does the system's architecture support multi-region deployment?
1. EventBridge global replication with cross-region SQS and DynamoDB Global Tables
2. Single region deployment only due to DynamoDB limitations
3. Manual data synchronization between regions using scheduled Lambda functions
4. Region-specific deployments with no data sharing between regions

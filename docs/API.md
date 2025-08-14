
## AWS CLI Commands for Product Catalog Management

### Infrastructure Overview

The Product Catalog BFF uses the following AWS services:
- **DynamoDB**: Primary storage (Global Table: `template-product-catalog-bff-{stage}-entities`)
- **API Gateway**: REST API endpoints with Cognito authentication
- **Lambda Functions**: Serverless handlers for REST, trigger, and listener functions
- **EventBridge + Kinesis**: Event-driven architecture for real-time updates
- **Cognito**: User authentication and authorization

### Getting Started with AWS CLI

#### 1. Discover Deployed Resources

```bash
# Get the API Gateway endpoint URL
aws apigateway get-rest-apis \
  --query "items[?name=='template-product-catalog-bff-dev'].{id:id,name:name}" \
  --region us-west-2

# Get the CloudFormation stack outputs
aws cloudformation describe-stacks \
  --stack-name template-product-catalog-bff-dev \
  --region us-west-2 \
  --query "Stacks[0].Outputs[?OutputKey=='ServiceEndpoint'].OutputValue" \
  --output text

# Find your User Pool ID
aws cognito-idp list-user-pools \
  --max-items 10 \
  --region us-west-2 \
  --query "UserPools[?Name=='template-cognito-resources-dev-user-pool']"
```

#### 2. Authentication Setup

```bash
# Authenticate and get JWT token (replace with your credentials)
aws cognito-idp admin-initiate-auth \
  --user-pool-id <USER_POOL_ID> \
  --client-id <CLIENT_ID> \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=<your-username>,PASSWORD=<your-password> \
  --region us-west-2

# Create a test user
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username testuser \
  --user-attributes Name=email,Value=test@example.com \
  --temporary-password TempPass123! \
  --region us-west-2

aws cognito-idp initiate-auth \
    --client-id 7moaas4is7prmjjcl2p7aee3tp \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME=admin,PASSWORD='Password!@#123' \
    --region us-west-2


aws cognito-idp admin-initiate-auth \
    --user-pool-id us-west-2_CyB6Jnyyc \
    --client-id 7moaas4is7prmjjcl2p7aee3tp \
    --auth-flow ADMIN_NO_SRP_AUTH \
    --auth-parameters USERNAME=admin,PASSWORD='' \
    --region us-west-2


# Here use ID_TOKEN !!!
```



#### 3. Adding Products via HTTP API
** https://6nvpvbmo3d.execute-api.us-west-2.amazonaws.com/dev
```bash
# Set your environment variables
API_ENDPOINT="https://6nvpvbmo3d.execute-api.us-west-2.amazonaws.com/dev"
JWT_TOKEN="ey..."

# Add a complete product with variants
curl -X PUT "$API_ENDPOINT/products/prod-001" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Bluetooth Headphones",
    "description": "Premium noise-cancelling headphones with 30-hour battery life",
    "sku": "WBH-2024-001",
    "price": 299.99,
    "category": "electronics",
    "status": "active",
    "stockQuantity": 100,
    "brand": "TechAudio",
    "weight": 0.25,
    "dimensions": {
      "length": 20,
      "width": 18,
      "height": 8
    },
    "images": ["https://example.com/headphones-1.jpg"],
    "tags": ["wireless", "bluetooth", "noise-cancelling"],
    "variants": [
      {
        "id": "var-001",
        "sku": "WBH-2024-001-BLACK",
        "name": "Black Wireless Headphones",
        "color": "black",
        "price": 299.99,
        "stockQuantity": 50,
        "status": "active"
      },
      {
        "id": "var-002", 
        "sku": "WBH-2024-001-WHITE",
        "name": "White Wireless Headphones",
        "color": "white",
        "price": 299.99,
        "stockQuantity": 50,
        "status": "active"
      }
    ]
  }'

# Add a simple product
curl -X PUT "$API_ENDPOINT/products/prod-002" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gaming Mouse",
    "sku": "GM-PRO-2024",
    "price": 79.99,
    "category": "electronics",
    "status": "active",
    "stockQuantity": 200,
    "brand": "GameGear"
  }'
```

### Direct DynamoDB Operations

#### Adding Products Directly to DynamoDB

```bash
# Add product directly to DynamoDB (bypasses API validation)
aws dynamodb put-item \
  --table-name template-product-catalog-bff-dev-entities \
  --item '{
    "pk": {"S": "prod-003"},
    "sk": {"S": "product"},
    "discriminator": {"S": "product"},
    "name": {"S": "Gaming Keyboard"},
    "sku": {"S": "GK-MECH-2024"},
    "price": {"N": "149.99"},
    "category": {"S": "electronics"},
    "status": {"S": "active"},
    "stockQuantity": {"N": "150"},
    "brand": {"S": "MechKeys"},
    "timestamp": {"N": "1704067200000"},
    "lastModifiedBy": {"S": "admin"},
    "awsregion": {"S": "us-west-2"},
    "ttl": {"N": "1735689600"}
  }' \
  --region us-west-2

# Add product variant
aws dynamodb put-item \
  --table-name template-product-catalog-bff-dev-entities \
  --item '{
    "pk": {"S": "prod-003"},
    "sk": {"S": "variant|var-003"},
    "discriminator": {"S": "product-variant"},
    "sku": {"S": "GK-MECH-2024-RGB"},
    "name": {"S": "RGB Gaming Keyboard"},
    "color": {"S": "black"},
    "price": {"N": "149.99"},
    "stockQuantity": {"N": "75"},
    "status": {"S": "active"},
    "timestamp": {"N": "1704067200000"},
    "lastModifiedBy": {"S": "admin"},
    "awsregion": {"S": "us-west-2"},
    "ttl": {"N": "1735689600"}
  }' \
  --region us-west-2
```

#### Querying DynamoDB

```bash
# Scan all products
aws dynamodb scan \
  --table-name template-product-catalog-bff-dev-entities \
  --filter-expression "discriminator = :disc" \
  --expression-attribute-values '{":disc":{"S":"product"}}' \
  --region us-west-2

# Query products using GSI1
aws dynamodb query \
  --table-name template-product-catalog-bff-dev-entities \
  --index-name gsi1 \
  --key-condition-expression "discriminator = :disc" \
  --expression-attribute-values '{":disc":{"S":"product"}}' \
  --region us-west-2

# Get specific product with all variants
aws dynamodb query \
  --table-name template-product-catalog-bff-dev-entities \
  --key-condition-expression "pk = :pk" \
  --expression-attribute-values '{":pk":{"S":"prod-001"}}' \
  --region us-west-2

# Query by category (if GSI2 is enabled)
aws dynamodb query \
  --table-name template-product-catalog-bff-dev-entities \
  --index-name gsi2 \
  --key-condition-expression "category = :cat" \
  --expression-attribute-values '{":cat":{"S":"electronics"}}' \
  --region us-west-2
```

### Monitoring and Management

#### Lambda Function Management

```bash
# List all product catalog Lambda functions
aws lambda list-functions \
  --query "Functions[?contains(FunctionName, 'product-catalog-bff')]" \
  --region us-west-2

# Get function configuration
aws lambda get-function-configuration \
  --function-name template-product-catalog-bff-dev-rest \
  --region us-west-2

# View recent logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-rest" \
  --start-time $(date -d "1 hour ago" +%s)000 \
  --region us-west-2
```

#### Event Monitoring

```bash
# List EventBridge rules
aws events list-rules \
  --event-bus-name template-event-hub-dev-bus \
  --region us-west-2

# Describe Kinesis stream
aws kinesis describe-stream \
  --stream-name template-event-hub-dev-stream1 \
  --region us-west-2

# Get stream records
aws kinesis get-records \
  --shard-iterator <shard-iterator> \
  --region us-west-2
```

#### API Gateway Management

```bash
# Get API Gateway deployment information
aws apigateway get-deployments \
  --rest-api-id <api-id> \
  --region us-west-2

# Test API Gateway endpoint
aws apigateway test-invoke-method \
  --rest-api-id <api-id> \
  --resource-id <resource-id> \
  --http-method GET \
  --path-with-query-string "/products" \
  --region us-west-2
```

### Bulk Operations and Scripts

#### Quick Setup Script

```bash
#!/bin/bash

# Product Catalog CLI Setup Script
STAGE="dev"
REGION="us-west-2"

echo "Setting up Product Catalog CLI environment..."

# Get API Gateway endpoint
API_ID=$(aws apigateway get-rest-apis \
  --query "items[?name=='template-product-catalog-bff-$STAGE'].id" \
  --output text --region $REGION)

if [ ! -z "$API_ID" ]; then
  export API_ENDPOINT="https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE"
  echo "API Endpoint: $API_ENDPOINT"
else
  echo "API Gateway not found. Make sure the service is deployed."
  exit 1
fi

# Check DynamoDB table status
TABLE_STATUS=$(aws dynamodb describe-table \
  --table-name template-product-catalog-bff-$STAGE-entities \
  --region $REGION \
  --query "Table.TableStatus" \
  --output text 2>/dev/null)

if [ "$TABLE_STATUS" = "ACTIVE" ]; then
  echo "DynamoDB table is active"
else
  echo "DynamoDB table not found or not active"
fi

echo "Setup complete. Set your JWT_TOKEN variable and start adding products!"
echo "Example: export JWT_TOKEN='your-jwt-token-here'"
```

#### Bulk Product Import Script

```bash
#!/bin/bash

# Bulk import products from JSON file
# Usage: ./bulk-import.sh products.json

PRODUCTS_FILE=$1
API_ENDPOINT=$API_ENDPOINT
JWT_TOKEN=$JWT_TOKEN

if [ -z "$PRODUCTS_FILE" ] || [ -z "$API_ENDPOINT" ] || [ -z "$JWT_TOKEN" ]; then
  echo "Usage: $0 <products-file.json>"
  echo "Make sure API_ENDPOINT and JWT_TOKEN are set"
  exit 1
fi

# Read products from JSON file and import each one
jq -c '.[]' $PRODUCTS_FILE | while read product; do
  product_id=$(echo $product | jq -r '.id')
  
  echo "Importing product: $product_id"
  
  curl -X PUT "$API_ENDPOINT/products/$product_id" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$product" \
    -w "\nStatus: %{http_code}\n"
  
  sleep 1  # Rate limiting
done
```

### Environment-Specific Commands

Replace `dev` with `np` (non-production) or `prd` (production) for different environments:

```bash
# Development environment
STAGE="dev"

# Non-production environment  
STAGE="np"

# Production environment
STAGE="prd"

# All commands can be adapted by changing the STAGE variable
aws dynamodb scan \
  --table-name template-product-catalog-bff-$STAGE-entities \
  --region us-west-2
```

### Troubleshooting Commands

```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks \
  --stack-name template-product-catalog-bff-dev \
  --region us-west-2 \
  --query "Stacks[0].StackStatus"

# List all CloudFormation stacks
aws cloudformation list-stacks \
  --query "StackSummaries[?contains(StackName, 'template')].{Name:StackName,Status:StackStatus}" \
  --region us-west-2

# Check Lambda function errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/template-product-catalog-bff-dev-rest" \
  --filter-pattern "ERROR" \
  --start-time $(date -d "24 hours ago" +%s)000 \
  --region us-west-2

# Validate DynamoDB table structure
aws dynamodb describe-table \
  --table-name template-product-catalog-bff-dev-entities \
  --region us-west-2 \
  --query "Table.{Name:TableName,Status:TableStatus,ItemCount:ItemCount,GSI:GlobalSecondaryIndexes[].{Name:IndexName,Status:IndexStatus}}"
``` 
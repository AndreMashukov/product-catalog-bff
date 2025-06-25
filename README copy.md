# Product Catalog BFF (Backend for Frontend)

A serverless backend service for managing an online shop's product catalog. This service provides CRUD operations for products and their variants, supporting comprehensive e-commerce product management.

## Features

- **Product Management**: Full CRUD operations for products
- **Product Variants**: Support for product variations (size, color, etc.)
- **Inventory Management**: Stock quantity tracking and updates
- **Price Management**: Dynamic pricing with update capabilities
- **Category Support**: Product categorization and filtering
- **Event-Driven Architecture**: DynamoDB streams and SQS integration
- **Scalable**: Built on AWS Lambda with auto-scaling

## API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | Query all products with pagination |
| GET | `/products/category/:category` | Get products by category |
| GET | `/products/:id` | Get a specific product with variants |
| PUT | `/products/:id` | Create or update a product |
| DELETE | `/products/:id` | Delete a product |
| PATCH | `/products/:id/stock` | Update product stock quantity |
| PATCH | `/products/:id/price` | Update product price |

### Product Variants

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/products/:id/variants/:variantId` | Create or update a product variant |
| DELETE | `/products/:id/variants/:variantId` | Delete a product variant |
| PATCH | `/products/:id/variants/:variantId/stock` | Update variant stock |
| PATCH | `/products/:id/variants/:variantId/price` | Update variant price |

## Data Models

### Product
```json
{
  "id": "product-123",
  "name": "Wireless Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "sku": "WH-1000XM4",
  "price": 299.99,
  "category": "electronics",
  "status": "active",
  "stockQuantity": 50,
  "images": ["image1.jpg", "image2.jpg"],
  "brand": "TechBrand",
  "weight": 0.5,
  "dimensions": {
    "length": 20,
    "width": 18,
    "height": 8
  },
  "tags": ["wireless", "bluetooth", "noise-cancelling"],
  "variants": [...] // Product variants
}
```

### Product Variant
```json
{
  "id": "variant-456",
  "sku": "WH-1000XM4-BLACK",
  "name": "Black Wireless Headphones",
  "price": 299.99,
  "color": "black",
  "size": "standard",
  "stockQuantity": 25,
  "status": "active",
  "images": ["black-variant.jpg"]
}
```

## Query Parameters

### Products Query
- `limit`: Number of items per page (default: 20)
- `last`: Last evaluated key for pagination
- `category`: Filter by product category
- `status`: Filter by product status (active, inactive, draft, etc.)
- `search`: Search term for product name/description
- `sortBy`: Sort field (default: timestamp)

## Status Values

### Product Status
- `draft`: Product in development
- `active`: Available for sale
- `inactive`: Temporarily unavailable
- `out_of_stock`: No inventory available
- `discontinued`: No longer sold

## Environment Variables

- `ENTITY_TABLE_NAME`: DynamoDB table name for storing products
- `AWS_REGION`: AWS region for deployment
- `PROJECT`: Project identifier for API prefix

## Development

### Prerequisites
- Node.js 16.x or later
- AWS CLI configured
- Serverless Framework installed globally

### Installation
```bash
npm install
```

### Local Development
```bash
npm start
```
This starts the service locally on port 3001 with offline mode.

### Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:int

# Linting
npm run lint
```

### Deployment
```bash
# Deploy to non-production (us-west-2)
npm run dp:np:w

# Deploy to production (us-west-2)
npm run dp:prd:w
```

## Architecture

This service follows an event-driven architecture:

1. **REST API**: Lambda function handling HTTP requests
2. **DynamoDB**: Primary data store with streams enabled
3. **Event Processing**: Lambda triggers for data changes
4. **SQS Integration**: Message queuing for async processing

## Event Types

The service emits the following events:
- `product-draft`: Product created in draft status
- `product-published`: Product activated
- `product-deactivated`: Product deactivated
- `product-out-of-stock`: Product inventory depleted
- `product-discontinued`: Product permanently removed
- `product-deleted`: Product deleted

## Security

- JWT-based authentication
- Role-based access control (manager, admin roles)
- Input validation and sanitization
- AWS IAM integration

## Monitoring

The service includes comprehensive logging and can be monitored through:
- CloudWatch Logs
- CloudWatch Metrics
- AWS X-Ray tracing
- Custom dashboards

<img src="overview.png" width="700">

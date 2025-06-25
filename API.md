# Product Catalog API Documentation

## Base URL
```
https://api.yourcompany.com/product-catalog
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Products

### Query Products
Get a paginated list of products with optional filtering.

**Endpoint:** `GET /products`

**Query Parameters:**
- `limit` (integer, optional): Number of items per page (default: 20, max: 100)
- `last` (string, optional): Last evaluated key for pagination
- `category` (string, optional): Filter by product category
- `status` (string, optional): Filter by status (active, inactive, draft, discontinued)
- `search` (string, optional): Search term for product name/description
- `sortBy` (string, optional): Sort field (default: timestamp)

**Example Request:**
```http
GET /products?limit=10&category=electronics&status=active
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "prod-123",
      "name": "Wireless Headphones",
      "description": "Premium noise-cancelling headphones",
      "sku": "WH-1000XM4",
      "price": 299.99,
      "category": "electronics",
      "status": "active",
      "stockQuantity": 150,
      "brand": "TechBrand",
      "images": ["https://cdn.example.com/headphones-1.jpg"],
      "variants": [
        {
          "id": "var-456",
          "sku": "WH-1000XM4-BLACK",
          "color": "black",
          "price": 299.99,
          "stockQuantity": 75
        }
      ]
    }
  ],
  "last": "prod-123",
  "hasMore": true
}
```

### Get Product by ID
Retrieve a specific product with all its variants.

**Endpoint:** `GET /products/{id}`

**Example Request:**
```http
GET /products/prod-123
```

**Example Response:**
```json
{
  "id": "prod-123",
  "name": "Wireless Headphones",
  "description": "Premium noise-cancelling headphones with advanced features",
  "sku": "WH-1000XM4",
  "price": 299.99,
  "category": "electronics",
  "status": "active",
  "stockQuantity": 150,
  "brand": "TechBrand",
  "weight": 0.25,
  "dimensions": {
    "length": 20,
    "width": 18,
    "height": 8
  },
  "images": [
    "https://cdn.example.com/headphones-1.jpg",
    "https://cdn.example.com/headphones-2.jpg"
  ],
  "tags": ["wireless", "bluetooth", "noise-cancelling"],
  "variants": [
    {
      "id": "var-456",
      "sku": "WH-1000XM4-BLACK",
      "name": "Black Wireless Headphones",
      "color": "black",
      "price": 299.99,
      "stockQuantity": 75,
      "status": "active"
    },
    {
      "id": "var-457",
      "sku": "WH-1000XM4-WHITE",
      "name": "White Wireless Headphones",
      "color": "white",
      "price": 299.99,
      "stockQuantity": 75,
      "status": "active"
    }
  ]
}
```

### Create/Update Product
Create a new product or update an existing one.

**Endpoint:** `PUT /products/{id}`

**Required Fields:**
- `name` (string): Product name
- `sku` (string): Stock Keeping Unit
- `price` (number): Product price

**Example Request:**
```http
PUT /products/prod-124
Content-Type: application/json

{
  "name": "Gaming Mouse",
  "description": "High-precision gaming mouse with RGB lighting",
  "sku": "GM-PRO-2024",
  "price": 79.99,
  "category": "electronics",
  "status": "active",
  "stockQuantity": 200,
  "brand": "GameGear",
  "weight": 0.08,
  "dimensions": {
    "length": 12,
    "width": 6,
    "height": 4
  },
  "images": ["https://cdn.example.com/mouse-1.jpg"],
  "tags": ["gaming", "rgb", "wireless"],
  "variants": [
    {
      "id": "var-001",
      "sku": "GM-PRO-2024-BLACK",
      "name": "Black Gaming Mouse",
      "color": "black",
      "price": 79.99,
      "stockQuantity": 100
    }
  ]
}
```

**Example Response:**
```json
{
  "message": "Product saved successfully"
}
```

### Delete Product
Soft delete a product (marks as deleted, doesn't remove from database).

**Endpoint:** `DELETE /products/{id}`

**Example Request:**
```http
DELETE /products/prod-124
```

**Example Response:**
```json
{
  "message": "Product deleted successfully"
}
```

### Update Product Stock
Update the stock quantity for a product.

**Endpoint:** `PATCH /products/{id}/stock`

**Example Request:**
```http
PATCH /products/prod-123/stock
Content-Type: application/json

{
  "stockChange": -5
}
```

**Example Response:**
```json
{
  "message": "Product stock updated successfully"
}
```

### Update Product Price
Update the price for a product.

**Endpoint:** `PATCH /products/{id}/price`

**Example Request:**
```http
PATCH /products/prod-123/price
Content-Type: application/json

{
  "price": 279.99
}
```

**Example Response:**
```json
{
  "message": "Product price updated successfully"
}
```

### Get Products by Category
Get products filtered by a specific category.

**Endpoint:** `GET /products/category/{category}`

**Example Request:**
```http
GET /products/category/electronics?limit=5
```

## Product Variants

### Create/Update Product Variant
Create or update a product variant.

**Endpoint:** `PUT /products/{id}/variants/{variantId}`

**Required Fields:**
- `sku` (string): Variant SKU
- `price` (number): Variant price

**Example Request:**
```http
PUT /products/prod-123/variants/var-458
Content-Type: application/json

{
  "sku": "WH-1000XM4-BLUE",
  "name": "Blue Wireless Headphones",
  "color": "blue",
  "price": 299.99,
  "stockQuantity": 50,
  "status": "active",
  "images": ["https://cdn.example.com/headphones-blue.jpg"]
}
```

**Example Response:**
```json
{
  "message": "Product variant saved successfully"
}
```

### Delete Product Variant
Delete a product variant.

**Endpoint:** `DELETE /products/{id}/variants/{variantId}`

**Example Request:**
```http
DELETE /products/prod-123/variants/var-458
```

**Example Response:**
```json
{
  "message": "Product variant deleted successfully"
}
```

### Update Variant Stock
Update stock for a specific variant.

**Endpoint:** `PATCH /products/{id}/variants/{variantId}/stock`

**Example Request:**
```http
PATCH /products/prod-123/variants/var-456/stock
Content-Type: application/json

{
  "stockChange": 10
}
```

**Example Response:**
```json
{
  "message": "Product variant stock updated successfully"
}
```

### Update Variant Price
Update price for a specific variant.

**Endpoint:** `PATCH /products/{id}/variants/{variantId}/price`

**Example Request:**
```http
PATCH /products/prod-123/variants/var-456/price
Content-Type: application/json

{
  "price": 289.99
}
```

**Example Response:**
```json
{
  "message": "Product variant price updated successfully"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "message": "Product name, SKU, and price are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Product not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

API requests are limited to:
- 1000 requests per hour for authenticated users
- 100 requests per hour for unauthenticated requests

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
``` 
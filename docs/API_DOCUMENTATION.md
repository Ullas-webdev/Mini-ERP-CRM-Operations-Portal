# 🌐 Mini Operations ERP — API Documentation

Base URL: `/api/v1`

---

## 1. Authentication Endpoints

### `POST /api/v1/auth/login`
Authenticates a user and returns a JWT access token.

**Request Body:**
```json
{
  "email": "admin@demo.com",
  "password": "Demo@123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "user": {
      "id": "uuid",
      "name": "System Admin",
      "email": "admin@demo.com",
      "role": "ADMIN"
    }
  }
}
```

---

## 2. Location Endpoints

### `GET /api/v1/locations`
Returns all physical locations (Warehouse Alpha, Warehouse Beta, Assembly Line 1).  
**Authorization**: `ADMIN`, `OPERATIONS`, `SALES`

---

## 3. Inventory Endpoints

### `GET /api/v1/inventory`
Lists batch inventory records with physical, reserved, available stock, and low stock status.  
**Authorization**: `ADMIN`, `OPERATIONS`, `SALES`

### `POST /api/v1/inventory`
Initializes or creates a new batch inventory record.  
**Authorization**: `ADMIN`, `OPERATIONS`

### `POST /api/v1/inventory/adjust`
Adjusts physical stock level (IN/OUT) with audit ledger entry.  
**Authorization**: `ADMIN`, `OPERATIONS`

---

## 4. Work Order Endpoints

### `GET /api/v1/work-orders`
Lists Work Orders with live calculated material shortage.  
**Authorization**: `ADMIN`, `OPERATIONS`

### `POST /api/v1/work-orders`
Creates a new Work Order. Automatically computes shortage.  
**Authorization**: `ADMIN`

---

## 5. Stock Transfer Endpoints

### `GET /api/v1/transfers`
Lists stock transfers.  
**Authorization**: `ADMIN`, `OPERATIONS`

### `POST /api/v1/transfers`
Requests an internal stock transfer (`REQUESTED`).  
**Authorization**: `ADMIN`, `OPERATIONS`

### `POST /api/v1/transfers/:id/dispatch`
Dispatches transfer (`DISPATCHED`). Decrements source physical stock.  
**Authorization**: `ADMIN`, `OPERATIONS`

### `POST /api/v1/transfers/:id/receive`
Receives transfer (`RECEIVED`). Increments destination physical stock. Prevents double receive.  
**Authorization**: `ADMIN`, `OPERATIONS`

---

## 6. Customer Order & Reservation Endpoints

### `POST /api/v1/customer-orders`
Creates Customer Order and reserves stock against Available Quantity inside a transaction lock.  
**Authorization**: `ADMIN`, `SALES`

**Error Response (422 Unprocessable Entity):**
```json
{
  "success": false,
  "error": {
    "code": "UNPROCESSABLE_ENTITY",
    "message": "Cannot reserve more than available inventory. Product: 'Industrial Hydraulic Valve', Requested: 15, Available: 10"
  }
}
```

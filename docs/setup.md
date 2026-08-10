# Setup & Installation Guide

This guide details how to set up, run, and test the Mini ERP + CRM Operations Portal locally.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v16 (running locally on port 5432)

---

## Local Development Setup

### 1. Database Setup

Ensure PostgreSQL is running locally on port `5432` with a database named `erp_db`:

```sql
CREATE DATABASE erp_db;
CREATE USER erp_user WITH PASSWORD 'erp_password';
GRANT ALL PRIVILEGES ON DATABASE erp_db TO erp_user;
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Generate Prisma Client, Apply Schema & Seed Database
npx prisma generate
npx prisma db push
npx prisma db seed

# Start backend dev server
npm run dev
```

The backend server starts on `http://localhost:5000`.

### 3. Frontend Setup

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start Vite dev server
npm run dev
```

The frontend app starts on `http://localhost:3000` (or `http://localhost:5173`).

---

## Verification & Health Check

Send a GET request to verify the server status:

```bash
curl http://localhost:5000/api/v1/health
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "timestamp": "2026-08-10T19:00:00.000Z",
    "uptime": 12.34,
    "database": "connected",
    "environment": "development"
  }
}
```

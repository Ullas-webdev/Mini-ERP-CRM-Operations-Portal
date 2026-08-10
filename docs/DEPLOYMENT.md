# Free-Tier Infrastructure Deployment Guide

This guide provides step-by-step instructions for deploying the **Mini ERP + CRM Operations Portal** on production-ready free-tier cloud infrastructure:
- **Database**: Neon (Managed Serverless PostgreSQL)
- **Backend API**: Render (Node.js Web Service)
- **Frontend SPA**: Vercel (Static Web Hosting)

---

## 🗄️ 1. Database Provisioning (Neon PostgreSQL)

### Step 1: Create a Neon Project
1. Navigate to [Neon.tech](https://neon.tech) and sign in.
2. Click **Create Project**, name it `mini-erp-prod`, and select your preferred region.
3. Select **PostgreSQL 16**.

### Step 2: Retrieve the Connection String
1. In the Neon Dashboard, navigate to **Dashboard** -> **Connection Details**.
2. Copy the **Pooled Connection String** (or Direct Connection String). It follows this format:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@<ep-name>.neon.tech/neondb?sslmode=require"
   ```

### Step 3: Configure Prisma for PostgreSQL
For production PostgreSQL deployment, update the provider in `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 4: Run Migrations and Seed Database
Run the following commands from your local terminal against the Neon production database:
```bash
cd backend

# Set production database connection string
export DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

# Generate Prisma Client
npx prisma generate

# Push database schema to Neon
npx prisma db push

# Seed production database with 4 default role users and initial inventory
npx prisma db seed
```

---

## ⚙️ 2. Backend Deployment (Render Web Service)

### Step 1: Create a Render Web Service
1. Log into [Render.com](https://render.com) and click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure service settings:
   - **Name**: `mini-erp-backend`
   - **Region**: Choose closest to your Neon DB region.
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Step 2: Configure Environment Variables
In the Render Service Dashboard, navigate to **Environment** and add the following variables:

| Key | Example Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations & security filters |
| `PORT` | `5000` | HTTP listening port (Render sets this automatically) |
| `DATABASE_URL` | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` | Neon Postgres Connection String |
| `CORS_ORIGIN` | `https://mini-erp-frontend.vercel.app` | Allowed Vercel Frontend Origin (comma-separated if multiple) |
| `JWT_SECRET` | `prod-access-token-secret-key-minimum-32-chars-long` | Cryptographic secret for Access Tokens |
| `JWT_REFRESH_SECRET` | `prod-refresh-token-secret-key-minimum-32-chars-long` | Cryptographic secret for Refresh Cookies |
| `LOG_LEVEL` | `info` | Pino logging level |

---

## 🌐 3. Frontend Deployment (Vercel)

### Step 1: Deploy Project on Vercel
1. Log into [Vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 2: Configure Environment Variable
Add the environment variable pointing to your deployed Render backend API:

| Key | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://mini-erp-backend.onrender.com/api/v1` | Public HTTPS endpoint of Render backend |

### Step 3: Deploy & Update CORS
1. Click **Deploy**. Vercel will generate your live production URL (e.g. `https://mini-erp-frontend.vercel.app`).
2. Go back to **Render** -> **Environment** and ensure `CORS_ORIGIN` includes your exact Vercel URL.

---

## 🔐 4. Production Demo Accounts Verification

Once deployment completes, open your live Vercel URL. All 4 pre-seeded demo accounts will be functional out-of-the-box:

| Role | Email | Password | Allowed Capabilities |
|---|---|---|---|
| **ADMIN** | `admin@demo.com` | `Demo@123` | Full access, audit logs, system metrics, dashboard analytics |
| **SALES** | `sales@demo.com` | `Demo@123` | Customer CRM directory, lead management, sales challan creation/editing/confirmation/cancellation |
| **WAREHOUSE** | `warehouse@demo.com` | `Demo@123` | Inventory catalog, low stock alerts, physical stock adjustments (`IN`/`OUT`), append-only ledger |
| **ACCOUNTS** | `accounts@demo.com` | `Demo@123` | Financial summary, monthly revenue analytics, confirmed challan billing inspection |

---

## 📋 5. Assumptions Made

The following list documents all business logic, architectural, and security assumptions made during implementation:

### 1. Sales Challan & Stock Fulfillment Rules
- **Draft vs Confirmed State**: Sales Challans are created in `DRAFT` status without deducting inventory stock. Unit price and product name are snapshotted into `ChallanLineItem` at creation time to protect against future price updates.
- **Atomic Concurrency Control**: Challan confirmation executes within a single database transaction (`prisma.$transaction`) with `SERIALIZABLE` isolation and `FOR UPDATE` row locks. If any line item exceeds available stock, the entire transaction rolls back atomically without partial deductions, returning HTTP 422 detailing exact shortage per SKU.
- **Cancellation & Stock Reversal**:
  - Cancelling a `CONFIRMED` challan restores stock for all line items and appends an `IN` stock movement record with reason `"Challan CH-YYYY-NNNN cancellation reversal"`.
  - Cancelling a `DRAFT` challan updates status to `CANCELLED` without modifying stock levels.
- **Immutability Guard**: Challans in `CONFIRMED` or `CANCELLED` states cannot be edited. Attempts to modify non-draft challans return HTTP 409 Conflict.
- **Identifier Formatting**: Sales Challans auto-generate sequential numbers formatted as `CH-YYYY-NNNN` scoped to the current calendar year.

### 2. Inventory & Stock Movement Ledger
- **Append-Only Audit Trail**: Product stock changes can only occur via explicit stock adjustments or challan fulfillment/cancellation. Every adjustment creates an immutable `StockMovement` record (`IN` / `OUT`) linked to the active user.
- **Initial Inventory Seeding**: Initial product creation creates an `IN` movement entry with reason `"Initial physical inventory audit upload"`.
- **Low Stock Threshold**: Low stock alerts trigger whenever `currentStock <= minStockAlert`.

### 3. Security & Authentication Architecture
- **Dual Token Model**: 15-minute JWT Access Tokens passed via `Authorization: Bearer` headers, alongside 7-day HTTP-only `refreshToken` cookies for seamless renewal.
- **Brute-Force Account Lockout**: 5 consecutive failed login attempts lock a user account for 15 minutes (`lockedUntil`), returning HTTP 429/403.
- **Security Gateway Audit Logging**: Failed authorization attempts (HTTP 403 Forbidden) are logged asynchronously to `AuditLog` as `SUSPICIOUS_ACCESS_ATTEMPT` under the `SECURITY_GATEWAY` entity type.
- **Rate Limiting**: Auth routes (`/auth/*`) are rate-limited to 10 requests per 15 minutes per IP in production.

### 4. Domain Authorization Boundaries
- `SALES` users cannot adjust physical stock directly without creating/confirming a sales challan.
- `WAREHOUSE` users have read-only access to customer CRM records and sales challans.
- `ACCOUNTS` users have read-only access to product inventory and customer directories.
- `ADMIN` users possess un-restricted operational permissions and exclusive access to the system audit trail.

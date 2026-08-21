# 📖 Mini Operations ERP — User & Role Operations Guide

## 🔑 Demo Credentials

| Role | Demo Email | Password | Allowed Capabilities |
|---|---|---|---|
| **System Admin** | `admin@demo.com` | `Demo@123` | Full access: Work Orders, Transfers, Customer Orders, Inventory, System Health, Audit Logs. |
| **Operations Manager** | `ops@demo.com` | `Demo@123` | Inventory batch setup, stock adjustments, Work Order execution, Stock Transfer requests, dispatch & receipt. |
| **Sales Executive** | `sales@demo.com` | `Demo@123` | Customer profile management, Customer Order creation & stock reservations. |

---

## 🛠️ Step-by-Step Operations Walkthrough

### 1. View Physical Inventory & Available Stock
1. Log in as `ops@demo.com` or `admin@demo.com`.
2. Navigate to **Inventory** in the sidebar.
3. Observe Physical, Reserved, and Available Stock ($\text{Available} = \text{Physical} - \text{Reserved}$).
4. Filter by Location or search for SKU `SKU-VALVE-001`.

### 2. Create Production Work Order & Check Shortage
1. Log in as `admin@demo.com`.
2. Navigate to **Work Orders**.
3. Click **Create Work Order**. Select Location `Warehouse Alpha`, Product `Industrial Hydraulic Valve`, Required Quantity `100`.
4. Observe auto-calculated shortage: $\text{Shortage} = \max(0, 100 - 70) = 30\text{ units}$.

### 3. Inter-Warehouse Stock Transfer Lifecycle
1. Navigate to **Internal Transfers**.
2. Click **Request Stock Transfer**. Source: `Warehouse Beta`, Destination: `Warehouse Alpha`, Quantity: `40`.
3. Click **Dispatch**. Source inventory physical stock decreases by 40. Destination stock remains unchanged.
4. Click **Confirm Receipt**. Destination physical stock increases by 40.

### 4. Create Customer Order & Reserve Inventory
1. Log in as `sales@demo.com`.
2. Navigate to **Customer Orders**.
3. Click **Create Customer Order**. Select Customer `Apex Retailers Pvt Ltd`, Location `Warehouse Alpha`, Item `Industrial Hydraulic Valve`, Quantity `15`.
4. Click **Create Order & Reserve Inventory**.
5. Observe Reserved Quantity incremented by 15. Attempting to reserve beyond available stock displays a red `422 Unprocessable Entity` alert banner.

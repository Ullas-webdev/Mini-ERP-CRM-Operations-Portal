import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const Role = {
  ADMIN: 'ADMIN',
  OPERATIONS: 'OPERATIONS',
  SALES: 'SALES',
};

const WorkOrderStatus = {
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

const TransferStatus = {
  REQUESTED: 'REQUESTED',
  DISPATCHED: 'DISPATCHED',
  RECEIVED: 'RECEIVED',
};

const OrderStatus = {
  PENDING: 'PENDING',
  RESERVED: 'RESERVED',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
};

const MovementType = {
  IN: 'IN',
  OUT: 'OUT',
  TRANSFER_DISPATCH: 'TRANSFER_DISPATCH',
  TRANSFER_RECEIPT: 'TRANSFER_RECEIPT',
  RESERVATION: 'RESERVATION',
  RELEASE: 'RELEASE',
};

async function main() {
  console.log('🌱 Starting Database Seeding for Mini Operations ERP...');

  // Clean existing tables in reverse dependency order
  await prisma.orderItem.deleteMany();
  await prisma.customerOrder.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.location.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  const defaultPasswordHash = await bcrypt.hash('Demo@123', 10);

  // 1. Seed Users (Admin, Operations, Sales)
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@demo.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const opsUser = await prisma.user.create({
    data: {
      name: 'Operations Manager',
      email: 'ops@demo.com',
      passwordHash: defaultPasswordHash,
      role: Role.OPERATIONS,
      isActive: true,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Sales Executive',
      email: 'sales@demo.com',
      passwordHash: defaultPasswordHash,
      role: Role.SALES,
      isActive: true,
    },
  });

  console.log('👤 Created 3 Demo Users (admin@demo.com, ops@demo.com, sales@demo.com).');

  // 2. Seed Locations
  const locAlpha = await prisma.location.create({
    data: {
      code: 'LOC-WH-A',
      name: 'Warehouse Alpha',
      address: 'Plot 102 Industrial Estate, Mumbai',
    },
  });

  const locBeta = await prisma.location.create({
    data: {
      code: 'LOC-WH-B',
      name: 'Warehouse Beta',
      address: 'GIDC Sector 28, Gandhinagar',
    },
  });

  const locAsm = await prisma.location.create({
    data: {
      code: 'LOC-ASM-1',
      name: 'Assembly Line 1',
      address: 'Peenya Industrial Area, Bengaluru',
    },
  });

  console.log('📍 Created 3 Locations (Warehouse Alpha, Warehouse Beta, Assembly Line 1).');

  // 3. Seed Products
  const prodValve = await prisma.product.create({
    data: {
      name: 'Industrial Hydraulic Valve 3/4"',
      sku: 'SKU-VALVE-001',
      category: 'Hydraulics',
      unitPrice: 2450.0,
      minStockAlert: 15,
    },
  });

  const prodBearing = await prisma.product.create({
    data: {
      name: 'Precision Ball Bearing 6204-2RS',
      sku: 'SKU-BEAR-002',
      category: 'Bearings',
      unitPrice: 380.5,
      minStockAlert: 30,
    },
  });

  const prodGasket = await prisma.product.create({
    data: {
      name: 'Heavy Duty Gasket Kit',
      sku: 'SKU-GASKET-003',
      category: 'Seals & Gaskets',
      unitPrice: 890.0,
      minStockAlert: 20,
    },
  });

  const prodRelay = await prisma.product.create({
    data: {
      name: '4-Channel Relay Module 24V',
      sku: 'SKU-RELAY-008',
      category: 'Electrical',
      unitPrice: 450.0,
      minStockAlert: 50,
    },
  });

  console.log('📦 Created 4 Sample Products.');

  // 4. Seed Inventory Records with Batches
  const invValveAlpha = await prisma.inventory.create({
    data: {
      productId: prodValve.id,
      locationId: locAlpha.id,
      batchNumber: 'BATCH-2026-A',
      physicalQuantity: 100,
      reservedQuantity: 30, // Available = 70
    },
  });

  const invValveBeta = await prisma.inventory.create({
    data: {
      productId: prodValve.id,
      locationId: locBeta.id,
      batchNumber: 'BATCH-2026-B',
      physicalQuantity: 60,
      reservedQuantity: 0, // Available = 60
    },
  });

  const invBearingAlpha = await prisma.inventory.create({
    data: {
      productId: prodBearing.id,
      locationId: locAlpha.id,
      batchNumber: 'BATCH-2026-A',
      physicalQuantity: 150,
      reservedQuantity: 20, // Available = 130
    },
  });

  const invGasketAlpha = await prisma.inventory.create({
    data: {
      productId: prodGasket.id,
      locationId: locAlpha.id,
      batchNumber: 'BATCH-2026-A',
      physicalQuantity: 10,
      reservedQuantity: 0, // Available = 10 (Low stock)
    },
  });

  await prisma.inventory.create({
    data: {
      productId: prodRelay.id,
      locationId: locAsm.id,
      batchNumber: 'BATCH-2026-A',
      physicalQuantity: 200,
      reservedQuantity: 50, // Available = 150
    },
  });

  console.log('📊 Created Batch Inventories across Locations.');

  // 5. Seed Stock Movement Ledgers
  await prisma.stockMovement.createMany({
    data: [
      {
        inventoryId: invValveAlpha.id,
        quantityChanged: 100,
        movementType: MovementType.IN,
        reason: 'Initial physical inventory audit upload',
        createdById: opsUser.id,
      },
      {
        inventoryId: invValveAlpha.id,
        quantityChanged: 30,
        movementType: MovementType.RESERVATION,
        reason: 'Initial customer order reservation',
        createdById: salesUser.id,
      },
      {
        inventoryId: invValveBeta.id,
        quantityChanged: 60,
        movementType: MovementType.IN,
        reason: 'Initial warehouse receipt',
        createdById: opsUser.id,
      },
    ],
  });

  // 6. Seed Customers & Customer Orders
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Rajesh Sharma',
      mobile: '+919876543210',
      email: 'rajesh@apexretailers.in',
      businessName: 'Apex Retailers Pvt Ltd',
      gstNumber: '27AAAAA0000A1Z5',
      address: '102 Industrial Estate, Mumbai 400069',
      createdById: salesUser.id,
    },
  });

  const order1 = await prisma.customerOrder.create({
    data: {
      orderNumber: 'ORD-2026-0001',
      customerId: customer1.id,
      locationId: locAlpha.id,
      status: OrderStatus.RESERVED,
      totalAmount: 73500.0,
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: prodValve.id,
            quantity: 30,
            unitPriceSnapshot: 2450.0,
          },
        ],
      },
    },
  });

  console.log(`🧾 Created Customer Order (${order1.orderNumber}) with stock reservation.`);

  // 7. Seed Work Orders
  const wo1 = await prisma.workOrder.create({
    data: {
      workOrderNumber: 'WO-2026-0001',
      locationId: locAlpha.id,
      productId: prodValve.id,
      requiredQuantity: 100,
      assignedUserId: opsUser.id,
      createdById: adminUser.id,
      status: WorkOrderStatus.ASSIGNED,
    },
  });

  console.log(`⚙️ Created Work Order (${wo1.workOrderNumber}) requiring 100 units.`);

  // 8. Seed Stock Transfers
  const tr1 = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TR-2026-0001',
      sourceLocationId: locBeta.id,
      destinationLocationId: locAlpha.id,
      productId: prodValve.id,
      quantity: 40,
      status: TransferStatus.REQUESTED,
      createdById: opsUser.id,
    },
  });

  console.log(`🚚 Created Stock Transfer (${tr1.transferNumber}) in REQUESTED status.`);

  // 9. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'DATABASE_SEEDED',
      entityType: 'SYSTEM',
      entityId: 'seed-operations-v2',
      afterState: JSON.stringify({
        users: 3,
        locations: 3,
        products: 4,
        inventories: 5,
      }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🛡️ Logged AuditLog seed event.');
  console.log('✅ Mini Operations ERP Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

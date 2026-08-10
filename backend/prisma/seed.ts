import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Enums definition for seed type-safety
const Role = {
  ADMIN: 'ADMIN',
  SALES: 'SALES',
  WAREHOUSE: 'WAREHOUSE',
  ACCOUNTS: 'ACCOUNTS',
} as const;

const CustomerType = {
  RETAIL: 'RETAIL',
  WHOLESALE: 'WHOLESALE',
  DISTRIBUTOR: 'DISTRIBUTOR',
} as const;

const CustomerStatus = {
  LEAD: 'LEAD',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

const MovementType = {
  IN: 'IN',
  OUT: 'OUT',
} as const;

const ChallanStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // Clean existing tables in reverse dependency order
  await prisma.challanLineItem.deleteMany();
  await prisma.salesChallan.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.customerNote.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // Hash standard demo password
  const defaultPasswordHash = await bcrypt.hash('Demo@123', 10);

  // 1. Seed Demo Users per Role
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@demo.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
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

  const warehouseUser = await prisma.user.create({
    data: {
      name: 'Warehouse Controller',
      email: 'warehouse@demo.com',
      passwordHash: defaultPasswordHash,
      role: Role.WAREHOUSE,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Finance Manager',
      email: 'accounts@demo.com',
      passwordHash: defaultPasswordHash,
      role: Role.ACCOUNTS,
      isActive: true,
    },
  });

  console.log('👤 Created 4 Demo Users (admin, sales, warehouse, accounts).');

  // 2. Seed 5 Sample Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Rajesh Sharma',
      mobile: '+919876543210',
      email: 'rajesh@apexretailers.in',
      businessName: 'Apex Retailers Pvt Ltd',
      gstNumber: '27AAAAA0000A1Z5',
      customerType: CustomerType.RETAIL,
      address: '102 Industrial Estate, Andheri East, Mumbai 400069',
      status: CustomerStatus.ACTIVE,
      createdBy: salesUser.id,
    },
  });

  await prisma.customer.create({
    data: {
      name: 'Vikram Patel',
      mobile: '+919823456789',
      email: 'vikram@logisticsglobal.com',
      businessName: 'Logistics Global Supply',
      gstNumber: '24BBBBA1111B2Z6',
      customerType: CustomerType.WHOLESALE,
      address: 'GIDC Plot 45, Sector 28, Gandhinagar 382028',
      status: CustomerStatus.ACTIVE,
      createdBy: salesUser.id,
    },
  });

  await prisma.customer.create({
    data: {
      name: 'Anita Desai',
      mobile: '+919911223344',
      email: 'anita@metrodip.co.in',
      businessName: 'Metro Distributors',
      gstNumber: '29CCCCA2222C3Z7',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Industrial Ring Road, Peenya, Bengaluru 560058',
      status: CustomerStatus.ACTIVE,
      createdBy: adminUser.id,
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      name: 'Suresh Menon',
      mobile: '+919766554433',
      email: 'suresh@menonenterprises.com',
      businessName: 'Menon Enterprises',
      gstNumber: null,
      customerType: CustomerType.RETAIL,
      address: 'MG Road Trade Center, Kochi 682016',
      status: CustomerStatus.LEAD,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: salesUser.id,
    },
  });

  await prisma.customer.create({
    data: {
      name: 'Priya Verma',
      mobile: '+919123456780',
      email: 'priya@urbanmart.org',
      businessName: 'Urban Mart Solutions',
      gstNumber: '07DDDDD3333D4Z8',
      customerType: CustomerType.WHOLESALE,
      address: 'Connaught Place Outer Ring, New Delhi 110001',
      status: CustomerStatus.LEAD,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      createdBy: salesUser.id,
    },
  });

  console.log('🏢 Created 5 Sample Customers.');

  // Seed Customer Notes
  await prisma.customerNote.createMany({
    data: [
      {
        customerId: customer1.id,
        authorId: salesUser.id,
        note: 'Initial inquiry regarding bulk purchase of hydraulic valves.',
      },
      {
        customerId: customer1.id,
        authorId: salesUser.id,
        note: 'Sent formal quotation for 50 units. Awaiting PO approval.',
      },
      {
        customerId: customer4.id,
        authorId: salesUser.id,
        note: 'Lead expressed interest in relay modules. Scheduled demo call next week.',
      },
    ],
  });

  console.log('📝 Created Customer Activity Notes.');

  // 3. Seed 10 Sample Products (At least 2 products strictly BELOW minStockAlert)
  const productsData = [
    {
      name: 'Industrial Hydraulic Valve 3/4"',
      sku: 'SKU-VALVE-001',
      category: 'Hydraulics',
      unitPrice: 2450.00,
      currentStock: 45,
      minStockAlert: 15,
      warehouseLocation: 'Rack A-12',
    },
    {
      name: 'Precision Ball Bearing 6204-2RS',
      sku: 'SKU-BEAR-002',
      category: 'Bearings',
      unitPrice: 380.50,
      currentStock: 120,
      minStockAlert: 30,
      warehouseLocation: 'Bin B-04',
    },
    {
      name: 'Heavy Duty Gasket Kit (High Temp)',
      sku: 'SKU-GASKET-003',
      category: 'Seals & Gaskets',
      unitPrice: 890.00,
      currentStock: 3, // ⚠️ CRITICAL LOW STOCK (min: 20)
      minStockAlert: 20,
      warehouseLocation: 'Shelf C-01',
    },
    {
      name: 'Stainless Steel Flange 4" ANSI 150',
      sku: 'SKU-FLANGE-004',
      category: 'Piping',
      unitPrice: 1750.00,
      currentStock: 85,
      minStockAlert: 25,
      warehouseLocation: 'Rack D-08',
    },
    {
      name: 'Digital Pressure Transmitter 0-10 Bar',
      sku: 'SKU-SENSOR-005',
      category: 'Instrumentation',
      unitPrice: 4200.00,
      currentStock: 4, // ⚠️ CRITICAL LOW STOCK (min: 15)
      minStockAlert: 15,
      warehouseLocation: 'Cabinet E-02',
    },
    {
      name: 'High Pressure Reinforced Hose 10m',
      sku: 'SKU-HOSE-006',
      category: 'Hoses',
      unitPrice: 1250.00,
      currentStock: 60,
      minStockAlert: 10,
      warehouseLocation: 'Rack A-05',
    },
    {
      name: 'Pneumatic Rotary Actuator 90-Deg',
      sku: 'SKU-ACTUATOR-007',
      category: 'Pneumatics',
      unitPrice: 5600.00,
      currentStock: 18,
      minStockAlert: 5,
      warehouseLocation: 'Shelf F-10',
    },
    {
      name: '4-Channel Electrical Relay Module 24V',
      sku: 'SKU-RELAY-008',
      category: 'Electrical',
      unitPrice: 450.00,
      currentStock: 200,
      minStockAlert: 50,
      warehouseLocation: 'Bin B-18',
    },
    {
      name: 'PLC Industrial Control Panel System',
      sku: 'SKU-PANEL-009',
      category: 'Automation',
      unitPrice: 28500.00,
      currentStock: 8,
      minStockAlert: 3,
      warehouseLocation: 'Zone G-01',
    },
    {
      name: 'Thermal Pipe Insulation Wrap 50mm',
      sku: 'SKU-INSUL-010',
      category: 'Insulation',
      unitPrice: 620.00,
      currentStock: 2, // ⚠️ CRITICAL LOW STOCK (min: 10)
      minStockAlert: 10,
      warehouseLocation: 'Rack C-14',
    },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const prod = await prisma.product.create({ data: p });
    createdProducts.push(prod);
  }

  console.log('📦 Created 10 Sample Products (including 3 products below minStockAlert).');

  // 4. Seed Stock Movements (Append-only ledger entries)
  for (const prod of createdProducts) {
    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        quantityChanged: prod.currentStock,
        movementType: MovementType.IN,
        reason: 'Initial physical inventory audit upload',
        createdBy: warehouseUser.id,
      },
    });
  }

  console.log('📈 Logged initial ledger StockMovements.');

  // 5. Seed Sample Sales Challans with Line Items & Snapshots
  const sampleChallan = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-0001',
      customerId: customer1.id,
      status: ChallanStatus.CONFIRMED,
      totalQuantity: 5,
      createdBy: salesUser.id,
      confirmedAt: new Date(),
      lineItems: {
        create: [
          {
            productId: createdProducts[0].id,
            quantity: 2,
            unitPriceSnapshot: createdProducts[0].unitPrice,
            productNameSnapshot: createdProducts[0].name,
          },
          {
            productId: createdProducts[1].id,
            quantity: 3,
            unitPriceSnapshot: createdProducts[1].unitPrice,
            productNameSnapshot: createdProducts[1].name,
          },
        ],
      },
    },
  });

  console.log(`🧾 Created sample SalesChallan (${sampleChallan.challanNumber}) with line item price snapshots.`);

  // 6. Seed Sample Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'DATABASE_SEEDED',
      entityType: 'SYSTEM',
      entityId: 'seed-initial-v1',
      afterState: JSON.stringify({
        usersCreated: 4,
        customersCreated: 5,
        productsCreated: 10,
      }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🛡️ Logged AuditLog seed event.');
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

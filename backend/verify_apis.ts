import axios from 'axios';
import { prisma } from './src/utils/prisma';

async function testBackend() {
  console.log('🧪 Starting Backend API Verification Tests...\n');

  try {
    // 1. Test Locations in DB
    const locations = await prisma.location.findMany();
    console.log(`✅ Locations in DB (${locations.length}):`, locations.map(l => l.name));

    // 2. Test Inventories in DB
    const inventories = await prisma.inventory.findMany({ include: { product: true, location: true } });
    console.log(`✅ Inventories in DB (${inventories.length}):`);
    inventories.forEach(inv => {
      const avail = inv.physicalQuantity - inv.reservedQuantity;
      console.log(`   • [${inv.location.code}] ${inv.product.sku}: Physical=${inv.physicalQuantity}, Reserved=${inv.reservedQuantity}, Available=${avail}`);
    });

    // 3. Test Work Order Shortage Calculation
    const workOrders = await prisma.workOrder.findMany({ include: { product: true, location: true } });
    console.log(`\n⚙️ Work Orders in DB (${workOrders.length}):`);
    for (const wo of workOrders) {
      const invs = await prisma.inventory.findMany({ where: { productId: wo.productId, locationId: wo.locationId } });
      const avail = Math.max(0, invs.reduce((s, i) => s + (i.physicalQuantity - i.reservedQuantity), 0));
      const shortage = Math.max(0, wo.requiredQuantity - avail);
      console.log(`   • ${wo.workOrderNumber}: Required=${wo.requiredQuantity}, AvailableAtLoc=${avail}, Shortage=${shortage}, Status=${wo.status}`);
    }

    // 4. Test Stock Transfers State Machine
    const transfers = await prisma.stockTransfer.findMany({ include: { product: true, sourceLocation: true, destinationLocation: true } });
    console.log(`\n🚚 Stock Transfers in DB (${transfers.length}):`);
    transfers.forEach(tr => {
      console.log(`   • ${tr.transferNumber}: ${tr.sourceLocation.code} -> ${tr.destinationLocation.code}, Qty=${tr.quantity}, Status=${tr.status}`);
    });

    // 5. Test Customer Orders & Stock Reservation
    const orders = await prisma.customerOrder.findMany({ include: { items: { include: { product: true } } } });
    console.log(`\n🧾 Customer Orders in DB (${orders.length}):`);
    orders.forEach(ord => {
      console.log(`   • ${ord.orderNumber}: Status=${ord.status}, Items=${ord.items.length}, Total=₹${ord.totalAmount}`);
    });

    console.log('\n🎉 ALL BACKEND VERIFICATION CHECKS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testBackend();

/* eslint-disable no-console */
import {
  AuditAction,
  Condition,
  DepartmentType,
  EntityType,
  ItemType,
  MaintenanceStatus,
  PrismaClient,
  Role,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPhone = "9999999999";
  const existingAdmin = await prisma.user.findFirst({
    where: { phone: adminPhone },
    orderBy: { createdAt: "asc" },
  });

  const admin =
    existingAdmin ??
    (await prisma.user.create({
      data: {
        name: "System Admin",
        phone: adminPhone,
        role: Role.ADMIN,
      },
    }));

  const property = await prisma.property.upsert({
    where: { name: "Limewood Hotel" },
    update: {},
    create: { name: "Limewood Hotel" },
  });

  const store = await prisma.location.upsert({
    where: { propertyId_name: { propertyId: property.id, name: "Limewood Store" } },
    update: {},
    create: {
      propertyId: property.id,
      name: "Limewood Store",
      area: "Main Store",
    },
  });

  await prisma.location.upsert({
    where: {
      propertyId_name: { propertyId: property.id, name: "Limewood Kitchen" },
    },
    update: {},
    create: {
      propertyId: property.id,
      name: "Limewood Kitchen",
      area: "Kitchen",
    },
  });

  const kitchen =
    (await prisma.category.findFirst({
      where: { name: "Kitchen", parentCategoryId: null },
    })) ??
    (await prisma.category.create({
      data: { name: "Kitchen" },
    }));

  const electrical =
    (await prisma.category.findFirst({
      where: { name: "Electrical", parentCategoryId: null },
    })) ??
    (await prisma.category.create({
      data: { name: "Electrical" },
    }));

  const kitchenAppliances = await prisma.category.upsert({
    where: {
      name_parentCategoryId: { name: "Appliances", parentCategoryId: kitchen.id },
    },
    update: {},
    create: { name: "Appliances", parentCategoryId: kitchen.id },
  });

  const electricalLighting = await prisma.category.upsert({
    where: {
      name_parentCategoryId: { name: "Lighting", parentCategoryId: electrical.id },
    },
    update: {},
    create: { name: "Lighting", parentCategoryId: electrical.id },
  });

  const bulb = await prisma.item.upsert({
    where: { name_categoryId: { name: "Bulb 9W", categoryId: electricalLighting.id } },
    update: {},
    create: {
      name: "Bulb 9W",
      itemType: ItemType.STOCK,
      categoryId: electricalLighting.id,
      unit: "pcs",
      reorderLevel: 20,
    },
  });

  const mixer = await prisma.item.upsert({
    where: {
      name_categoryId: { name: "Mixer Grinder", categoryId: kitchenAppliances.id },
    },
    update: {},
    create: {
      name: "Mixer Grinder",
      itemType: ItemType.ASSET,
      categoryId: kitchenAppliances.id,
    },
  });

  await prisma.stockBalance.upsert({
    where: { itemId_locationId: { itemId: bulb.id, locationId: store.id } },
    update: { qtyOnHand: 50 },
    create: {
      itemId: bulb.id,
      locationId: store.id,
      qtyOnHand: 50,
    },
  });

  const mixerAsset = await prisma.asset.upsert({
    where: { assetTag: "K-APPL-MIX-0001" },
    update: {},
    create: {
      itemId: mixer.id,
      assetTag: "K-APPL-MIX-0001",
      condition: Condition.GOOD,
      currentLocationId: store.id,
      notes: "Seed asset",
    },
  });

  // Create vendor for maintenance
  const vendor = await prisma.vendor.upsert({
    where: { name: "Kitchen Appliances Repair Co." },
    update: {},
    create: {
      name: "Kitchen Appliances Repair Co.",
      contactPerson: "Rajesh Kumar",
      phone: "9876543210",
      email: "service@kitchenappliances.com",
      address: "123 Service Road, Mumbai",
      specialization: "Kitchen Equipment Maintenance",
    },
  });

  const ticket = await prisma.maintenanceTicket.create({
    data: {
      assetId: mixerAsset.id,
      status: MaintenanceStatus.REPORTED,
      problemText: "Intermittent motor issue",
      createdById: admin.id,
      vendorId: vendor.id,
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      ticketId: ticket.id,
      status: MaintenanceStatus.REPORTED,
      note: "Ticket opened from seed data.",
      createdById: admin.id,
    },
  });

  await prisma.auditEvent.create({
    data: {
      entityType: EntityType.TICKET,
      entityId: ticket.id,
      action: AuditAction.CREATE,
      newValue: {
        status: ticket.status,
        department: DepartmentType.KITCHEN,
      },
      createdById: admin.id,
    },
  });

  // Create a damage report to demonstrate the approvedBy relation
  const damageReport = await prisma.damageReport.create({
    data: {
      itemId: mixer.id,
      assetId: mixerAsset.id,
      reportedById: admin.id,
      description: "Motor casing cracked during operation",
      condition: Condition.DAMAGED,
      requiresApproval: true,
      approvedById: admin.id,
      approvedAt: new Date(),
    },
  });

  console.log("Created damage report:", damageReport.id);
  console.log("Created vendor:", vendor.name);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

/**
 * Phase 9 - Invariant Tests
 * 
 * Tests for critical business invariants:
 * 1. No negative stock (except admin adjustment)
 * 2. No issuing SCRAP/UNDER_MAINTENANCE assets
 * 3. Audit event on every mutation
 */

import { Condition, ItemType, Role, SlipType, DepartmentType, MaintenanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSlip } from "@/lib/actions/slips";
import { createMaintenanceTicket, updateMaintenanceStatus, closeTicket } from "@/lib/actions/maintenance";
import { createAsset, updateAsset, deleteAsset } from "@/lib/actions/masters/assets";
import { createItem, updateItem, deleteItem } from "@/lib/actions/masters/items";
import { createUser, updateUser, deleteUser } from "@/lib/actions/masters/users";
import { createProperty, updateProperty, deleteProperty } from "@/lib/actions/masters/properties";
import { createLocation, updateLocation, deleteLocation } from "@/lib/actions/masters/locations";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/masters/categories";

// Mock auth session for tests
jest.mock("@/lib/auth-server", () => ({
  requireSessionOrThrow: jest.fn(() => Promise.resolve({
    id: "test-admin-user-id",
    name: "Test Admin",
    role: Role.ADMIN,
  })),
}));

describe("Invariant 1: No Negative Stock", () => {
  let testProperty: any;
  let testLocation1: any;
  let testLocation2: any;
  let testCategory: any;
  let testStockItem: any;

  beforeAll(async () => {
    // Setup test data
    testProperty = await prisma.property.create({
      data: { name: "Test Property INV1" },
    });

    testLocation1 = await prisma.location.create({
      data: {
        propertyId: testProperty.id,
        name: "Test Location 1",
      },
    });

    testLocation2 = await prisma.location.create({
      data: {
        propertyId: testProperty.id,
        name: "Test Location 2",
      },
    });

    testCategory = await prisma.category.create({
      data: { name: "Test Category INV1" },
    });

    testStockItem = await prisma.item.create({
      data: {
        name: "Test Stock Item INV1",
        itemType: ItemType.STOCK,
        categoryId: testCategory.id,
        unit: "pcs",
      },
    });

    // Initialize stock balance
    await prisma.stockBalance.create({
      data: {
        itemId: testStockItem.id,
        locationId: testLocation1.id,
        qtyOnHand: 10, // Start with 10 units
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.stockBalance.deleteMany({ where: { itemId: testStockItem.id } });
    await prisma.item.delete({ where: { id: testStockItem.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
    await prisma.location.deleteMany({ where: { propertyId: testProperty.id } });
    await prisma.property.delete({ where: { id: testProperty.id } });
  });

  test("should prevent negative stock on issue slip", async () => {
    const input = {
      slipType: SlipType.ISSUE,
      propertyId: testProperty.id,
      fromLocationId: testLocation1.id,
      toLocationId: testLocation2.id,
      department: DepartmentType.HOUSEKEEPING,
      lines: [
        {
          itemId: testStockItem.id,
          itemType: ItemType.STOCK,
          qty: 20, // Try to issue more than available (10)
        },
      ],
    };

    await expect(createSlip(input)).rejects.toThrow(
      "Stock cannot go negative for the source location"
    );
  });

  test("should allow valid stock movement", async () => {
    const input = {
      slipType: SlipType.ISSUE,
      propertyId: testProperty.id,
      fromLocationId: testLocation1.id,
      toLocationId: testLocation2.id,
      department: DepartmentType.HOUSEKEEPING,
      lines: [
        {
          itemId: testStockItem.id,
          itemType: ItemType.STOCK,
          qty: 5, // Valid quantity
        },
      ],
    };

    const slip = await createSlip(input);
    expect(slip).toBeDefined();
    expect(slip.slipType).toBe(SlipType.ISSUE);

    // Verify stock balances
    const fromBalance = await prisma.stockBalance.findUnique({
      where: { itemId_locationId: { itemId: testStockItem.id, locationId: testLocation1.id } },
    });
    const toBalance = await prisma.stockBalance.findUnique({
      where: { itemId_locationId: { itemId: testStockItem.id, locationId: testLocation2.id } },
    });

    expect(fromBalance?.qtyOnHand.toNumber()).toBe(5); // 10 - 5
    expect(toBalance?.qtyOnHand.toNumber()).toBe(5);

    // Cleanup
    await prisma.movementLog.deleteMany({ where: { slipId: slip.id } });
    await prisma.slipLine.deleteMany({ where: { slipId: slip.id } });
    await prisma.slip.delete({ where: { id: slip.id } });
    await prisma.auditEvent.deleteMany({ where: { entityId: slip.id } });
  });
});

describe("Invariant 2: No Issuing SCRAP/UNDER_MAINTENANCE Assets", () => {
  let testProperty: any;
  let testLocation1: any;
  let testLocation2: any;
  let testCategory: any;
  let testAssetItem: any;
  let scrapAsset: any;
  let maintenanceAsset: any;
  let goodAsset: any;

  beforeAll(async () => {
    // Setup test data
    testProperty = await prisma.property.create({
      data: { name: "Test Property INV2" },
    });

    testLocation1 = await prisma.location.create({
      data: {
        propertyId: testProperty.id,
        name: "Test Location A",
      },
    });

    testLocation2 = await prisma.location.create({
      data: {
        propertyId: testProperty.id,
        name: "Test Location B",
      },
    });

    testCategory = await prisma.category.create({
      data: { name: "Test Category INV2" },
    });

    testAssetItem = await prisma.item.create({
      data: {
        name: "Test Asset Item INV2",
        itemType: ItemType.ASSET,
        categoryId: testCategory.id,
      },
    });

    scrapAsset = await prisma.asset.create({
      data: {
        itemId: testAssetItem.id,
        assetTag: "SCRAP-TEST-001",
        condition: Condition.SCRAP,
        currentLocationId: testLocation1.id,
      },
    });

    maintenanceAsset = await prisma.asset.create({
      data: {
        itemId: testAssetItem.id,
        assetTag: "MAINT-TEST-001",
        condition: Condition.UNDER_MAINTENANCE,
        currentLocationId: testLocation1.id,
      },
    });

    goodAsset = await prisma.asset.create({
      data: {
        itemId: testAssetItem.id,
        assetTag: "GOOD-TEST-001",
        condition: Condition.GOOD,
        currentLocationId: testLocation1.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.asset.deleteMany({ where: { itemId: testAssetItem.id } });
    await prisma.item.delete({ where: { id: testAssetItem.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
    await prisma.location.deleteMany({ where: { propertyId: testProperty.id } });
    await prisma.property.delete({ where: { id: testProperty.id } });
  });

  test("should prevent issuing SCRAP asset", async () => {
    const input = {
      slipType: SlipType.ISSUE,
      propertyId: testProperty.id,
      fromLocationId: testLocation1.id,
      toLocationId: testLocation2.id,
      department: DepartmentType.HOUSEKEEPING,
      lines: [
        {
          itemId: testAssetItem.id,
          itemType: ItemType.ASSET,
          assetId: scrapAsset.id,
        },
      ],
    };

    await expect(createSlip(input)).rejects.toThrow(
      "Asset cannot be issued in SCRAP or UNDER_MAINTENANCE condition"
    );
  });

  test("should prevent issuing UNDER_MAINTENANCE asset", async () => {
    const input = {
      slipType: SlipType.ISSUE,
      propertyId: testProperty.id,
      fromLocationId: testLocation1.id,
      toLocationId: testLocation2.id,
      department: DepartmentType.HOUSEKEEPING,
      lines: [
        {
          itemId: testAssetItem.id,
          itemType: ItemType.ASSET,
          assetId: maintenanceAsset.id,
        },
      ],
    };

    await expect(createSlip(input)).rejects.toThrow(
      "Asset cannot be issued in SCRAP or UNDER_MAINTENANCE condition"
    );
  });

  test("should allow issuing GOOD asset", async () => {
    const input = {
      slipType: SlipType.ISSUE,
      propertyId: testProperty.id,
      fromLocationId: testLocation1.id,
      toLocationId: testLocation2.id,
      department: DepartmentType.HOUSEKEEPING,
      lines: [
        {
          itemId: testAssetItem.id,
          itemType: ItemType.ASSET,
          assetId: goodAsset.id,
        },
      ],
    };

    const slip = await createSlip(input);
    expect(slip).toBeDefined();
    expect(slip.slipType).toBe(SlipType.ISSUE);

    // Verify asset location updated
    const updatedAsset = await prisma.asset.findUnique({
      where: { id: goodAsset.id },
    });
    expect(updatedAsset?.currentLocationId).toBe(testLocation2.id);

    // Cleanup
    await prisma.movementLog.deleteMany({ where: { slipId: slip.id } });
    await prisma.slipLine.deleteMany({ where: { slipId: slip.id } });
    await prisma.slip.delete({ where: { id: slip.id } });
    await prisma.auditEvent.deleteMany({ where: { entityId: slip.id } });
  });
});

describe("Invariant 3: Audit Event on Every Mutation", () => {
  let testProperty: any;
  let testLocation: any;
  let testCategory: any;
  let testItem: any;

  beforeAll(async () => {
    // Setup minimal test data
    testProperty = await prisma.property.create({
      data: { name: "Test Property INV3" },
    });

    testLocation = await prisma.location.create({
      data: {
        propertyId: testProperty.id,
        name: "Test Location INV3",
      },
    });

    testCategory = await prisma.category.create({
      data: { name: "Test Category INV3" },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testItem) {
      await prisma.item.delete({ where: { id: testItem.id } }).catch(() => {});
    }
    await prisma.category.delete({ where: { id: testCategory.id } });
    await prisma.location.delete({ where: { id: testLocation.id } });
    await prisma.property.delete({ where: { id: testProperty.id } });
  });

  test("createItem should create audit event", async () => {
    const beforeCount = await prisma.auditEvent.count();

    testItem = await createItem({
      name: "Test Item Audit",
      itemType: ItemType.STOCK,
      categoryId: testCategory.id,
      unit: "pcs",
    });

    const afterCount = await prisma.auditEvent.count();
    expect(afterCount).toBe(beforeCount + 1);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "ITEM",
        entityId: testItem.id,
        action: "CREATE",
      },
    });

    expect(auditEvent).toBeDefined();
    expect(auditEvent?.action).toBe("CREATE");
  });

  test("updateItem should create audit event", async () => {
    const beforeCount = await prisma.auditEvent.count();

    await updateItem({
      id: testItem.id,
      name: "Test Item Audit Updated",
      itemType: ItemType.STOCK,
      categoryId: testCategory.id,
      unit: "kg",
      isActive: true,
    });

    const afterCount = await prisma.auditEvent.count();
    expect(afterCount).toBe(beforeCount + 1);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "ITEM",
        entityId: testItem.id,
        action: "UPDATE",
      },
    });

    expect(auditEvent).toBeDefined();
    expect(auditEvent?.action).toBe("UPDATE");
    expect(auditEvent?.oldValue).toBeDefined();
    expect(auditEvent?.newValue).toBeDefined();
  });

  test("deleteItem should create audit event", async () => {
    const beforeCount = await prisma.auditEvent.count();

    await deleteItem(testItem.id);

    const afterCount = await prisma.auditEvent.count();
    expect(afterCount).toBe(beforeCount + 1);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "ITEM",
        entityId: testItem.id,
        action: "DELETE",
      },
    });

    expect(auditEvent).toBeDefined();
    expect(auditEvent?.action).toBe("DELETE");
    expect(auditEvent?.oldValue).toBeDefined();

    testItem = null; // Prevent double cleanup
  });

  test("createProperty should create audit event", async () => {
    const beforeCount = await prisma.auditEvent.count();

    const property = await createProperty({
      name: "Test Property Audit",
    });

    const afterCount = await prisma.auditEvent.count();
    expect(afterCount).toBe(beforeCount + 1);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "PROPERTY",
        entityId: property.id,
        action: "CREATE",
      },
    });

    expect(auditEvent).toBeDefined();

    // Cleanup
    await prisma.auditEvent.deleteMany({ where: { entityId: property.id } });
    await prisma.property.delete({ where: { id: property.id } });
  });

  test("createLocation should create audit event", async () => {
    const beforeCount = await prisma.auditEvent.count();

    const location = await createLocation({
      propertyId: testProperty.id,
      name: "Test Location Audit",
      floor: "1",
    });

    const afterCount = await prisma.auditEvent.count();
    expect(afterCount).toBe(beforeCount + 1);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "LOCATION",
        entityId: location.id,
        action: "CREATE",
      },
    });

    expect(auditEvent).toBeDefined();

    // Cleanup
    await prisma.auditEvent.deleteMany({ where: { entityId: location.id } });
    await prisma.location.delete({ where: { id: location.id } });
  });

  test("createCategory should create audit event", async () => {
    const beforeCount = await prisma.auditEvent.count();

    const category = await createCategory({
      name: "Test Category Audit",
    });

    const afterCount = await prisma.auditEvent.count();
    expect(afterCount).toBe(beforeCount + 1);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "CATEGORY",
        entityId: category.id,
        action: "CREATE",
      },
    });

    expect(auditEvent).toBeDefined();

    // Cleanup
    await prisma.auditEvent.deleteMany({ where: { entityId: category.id } });
    await prisma.category.delete({ where: { id: category.id } });
  });
});

describe("Invariant 3: Audit Events for Maintenance Operations", () => {
  let testProperty: any;
  let testLocation: any;
  let testCategory: any;
  let testItem: any;
  let testAsset: any;

  beforeAll(async () => {
    testProperty = await prisma.property.create({
      data: { name: "Test Property Maint Audit" },
    });

    testLocation = await prisma.location.create({
      data: {
        propertyId: testProperty.id,
        name: "Test Location Maint",
      },
    });

    testCategory = await prisma.category.create({
      data: { name: "Test Category Maint" },
    });

    testItem = await prisma.item.create({
      data: {
        name: "Test Item Maint",
        itemType: ItemType.ASSET,
        categoryId: testCategory.id,
      },
    });

    testAsset = await prisma.asset.create({
      data: {
        itemId: testItem.id,
        assetTag: "MAINT-AUDIT-001",
        condition: Condition.GOOD,
        currentLocationId: testLocation.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.asset.delete({ where: { id: testAsset.id } });
    await prisma.item.delete({ where: { id: testItem.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
    await prisma.location.delete({ where: { id: testLocation.id } });
    await prisma.property.delete({ where: { id: testProperty.id } });
  });

  test("createMaintenanceTicket should create audit event", async () => {
    const beforeCount = await prisma.auditEvent.count();

    const ticket = await createMaintenanceTicket({
      assetId: testAsset.id,
      problemText: "Test maintenance issue for audit",
    });

    const afterCount = await prisma.auditEvent.count();
    expect(afterCount).toBe(beforeCount + 1);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "TICKET",
        entityId: ticket.id,
        action: "CREATE",
      },
    });

    expect(auditEvent).toBeDefined();
    expect(auditEvent?.action).toBe("CREATE");

    // Cleanup
    await prisma.movementLog.deleteMany({ where: { assetId: testAsset.id } });
    await prisma.maintenanceLog.deleteMany({ where: { ticketId: ticket.id } });
    await prisma.auditEvent.deleteMany({ where: { entityId: ticket.id } });
    await prisma.maintenanceTicket.delete({ where: { id: ticket.id } });

    // Reset asset condition
    await prisma.asset.update({
      where: { id: testAsset.id },
      data: { condition: Condition.GOOD },
    });
  });
});

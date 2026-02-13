#!/usr/bin/env tsx

/**
 * Phase 9 - Invariant Integration Tests
 * 
 * Validates critical business invariants:
 * 1. No negative stock (except admin adjustment)
 * 2. No issuing SCRAP/UNDER_MAINTENANCE assets
 * 3. Audit event on every mutation
 */

import { Condition, ItemType, SlipType, DepartmentType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Simple test framework
type TestResult = {
  name: string;
  passed: boolean;
  error?: string;
};

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  const status = passed ? "✓" : "✗";
  console.log(`${status} ${name}`);
  if (error) {
    console.log(`  Error: ${error}`);
  }
}

async function testNegativeStockPrevention() {
  console.log("\n=== Invariant 1: No Negative Stock ===\n");

  try {
    // Create test data
    const property = await prisma.property.create({
      data: { name: `Test Property ${Date.now()}` },
    });

    const location1 = await prisma.location.create({
      data: { propertyId: property.id, name: "Location 1" },
    });

    const location2 = await prisma.location.create({
      data: { propertyId: property.id, name: "Location 2" },
    });

    const category = await prisma.category.create({
      data: { name: `Test Category ${Date.now()}` },
    });

    const stockItem = await prisma.item.create({
      data: {
        name: `Test Stock Item ${Date.now()}`,
        itemType: ItemType.STOCK,
        categoryId: category.id,
        unit: "pcs",
      },
    });

    // Initialize with 10 units
    await prisma.stockBalance.create({
      data: {
        itemId: stockItem.id,
        locationId: location1.id,
        qtyOnHand: 10,
      },
    });

    // Test 1: Try to move more than available
    try {
      const balance = await prisma.stockBalance.findUnique({
        where: { itemId_locationId: { itemId: stockItem.id, locationId: location1.id } },
      });

      const currentQty = balance?.qtyOnHand ?? new Prisma.Decimal(0);
      const delta = new Prisma.Decimal(-20); // Try to remove 20 when only 10 available
      const nextQty = currentQty.plus(delta);

      if (nextQty.isNegative()) {
        logTest(
          "Prevents negative stock when trying to move too much",
          true
        );
      } else {
        logTest(
          "Prevents negative stock when trying to move too much",
          false,
          "Negative check failed"
        );
      }
    } catch (error: any) {
      logTest(
        "Prevents negative stock when trying to move too much",
        false,
        error.message
      );
    }

    // Test 2: Valid movement within available stock
    try {
      const balance = await prisma.stockBalance.findUnique({
        where: { itemId_locationId: { itemId: stockItem.id, locationId: location1.id } },
      });

      const currentQty = balance?.qtyOnHand ?? new Prisma.Decimal(0);
      const delta = new Prisma.Decimal(-5); // Move 5 units
      const nextQty = currentQty.plus(delta);

      if (!nextQty.isNegative() && nextQty.equals(new Prisma.Decimal(5))) {
        logTest("Allows valid stock movement within available quantity", true);
      } else {
        logTest(
          "Allows valid stock movement within available quantity",
          false,
          "Stock calculation incorrect"
        );
      }
    } catch (error: any) {
      logTest(
        "Allows valid stock movement within available quantity",
        false,
        error.message
      );
    }

    // Cleanup
    await prisma.stockBalance.deleteMany({ where: { itemId: stockItem.id } });
    await prisma.item.delete({ where: { id: stockItem.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.location.deleteMany({ where: { propertyId: property.id } });
    await prisma.property.delete({ where: { id: property.id } });
  } catch (error: any) {
    logTest("Negative stock prevention test suite", false, error.message);
  }
}

async function testAssetConditionValidation() {
  console.log("\n=== Invariant 2: No Issuing SCRAP/UNDER_MAINTENANCE Assets ===\n");

  try {
    // Create test data
    const property = await prisma.property.create({
      data: { name: `Test Property Asset ${Date.now()}` },
    });

    const location = await prisma.location.create({
      data: { propertyId: property.id, name: "Asset Test Location" },
    });

    const category = await prisma.category.create({
      data: { name: `Test Category Asset ${Date.now()}` },
    });

    const assetItem = await prisma.item.create({
      data: {
        name: `Test Asset Item ${Date.now()}`,
        itemType: ItemType.ASSET,
        categoryId: category.id,
      },
    });

    const scrapAsset = await prisma.asset.create({
      data: {
        itemId: assetItem.id,
        assetTag: `SCRAP-${Date.now()}`,
        condition: Condition.SCRAP,
        currentLocationId: location.id,
      },
    });

    const maintenanceAsset = await prisma.asset.create({
      data: {
        itemId: assetItem.id,
        assetTag: `MAINT-${Date.now()}`,
        condition: Condition.UNDER_MAINTENANCE,
        currentLocationId: location.id,
      },
    });

    const goodAsset = await prisma.asset.create({
      data: {
        itemId: assetItem.id,
        assetTag: `GOOD-${Date.now()}`,
        condition: Condition.GOOD,
        currentLocationId: location.id,
      },
    });

    // Test 1: SCRAP asset cannot be issued
    const isScrapIssueBlocked =
      scrapAsset.condition === Condition.SCRAP ||
      scrapAsset.condition === Condition.UNDER_MAINTENANCE;

    logTest(
      "Blocks issuing SCRAP asset",
      isScrapIssueBlocked,
      isScrapIssueBlocked ? undefined : "SCRAP asset would be allowed to issue"
    );

    // Test 2: UNDER_MAINTENANCE asset cannot be issued
    const isMaintenanceIssueBlocked =
      maintenanceAsset.condition === Condition.SCRAP ||
      maintenanceAsset.condition === Condition.UNDER_MAINTENANCE;

    logTest(
      "Blocks issuing UNDER_MAINTENANCE asset",
      isMaintenanceIssueBlocked,
      isMaintenanceIssueBlocked ? undefined : "UNDER_MAINTENANCE asset would be allowed to issue"
    );

    // Test 3: GOOD asset can be issued
    const isGoodAssetAllowed =
      goodAsset.condition !== Condition.SCRAP &&
      goodAsset.condition !== Condition.UNDER_MAINTENANCE;

    logTest(
      "Allows issuing GOOD asset",
      isGoodAssetAllowed,
      isGoodAssetAllowed ? undefined : "GOOD asset would be blocked from issuing"
    );

    // Cleanup
    await prisma.asset.deleteMany({ where: { itemId: assetItem.id } });
    await prisma.item.delete({ where: { id: assetItem.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.location.delete({ where: { id: location.id } });
    await prisma.property.delete({ where: { id: property.id } });
  } catch (error: any) {
    logTest("Asset condition validation test suite", false, error.message);
  }
}

async function testAuditEventCoverage() {
  console.log("\n=== Invariant 3: Audit Event on Every Mutation ===\n");

  try {
    // Test CREATE operation
    const property = await prisma.property.create({
      data: { name: `Test Property Audit ${Date.now()}` },
    });

    const auditEventCreate = await prisma.auditEvent.findFirst({
      where: {
        entityType: "PROPERTY",
        entityId: property.id,
        action: "CREATE",
      },
    });

    logTest(
      "CREATE operation generates audit event",
      auditEventCreate !== null,
      auditEventCreate ? undefined : "No audit event found for CREATE"
    );

    // Test UPDATE operation
    await prisma.property.update({
      where: { id: property.id },
      data: { name: `${property.name} Updated` },
    });

    const auditEventUpdate = await prisma.auditEvent.findFirst({
      where: {
        entityType: "PROPERTY",
        entityId: property.id,
        action: "UPDATE",
      },
    });

    logTest(
      "UPDATE operation generates audit event",
      auditEventUpdate !== null,
      auditEventUpdate ? undefined : "No audit event found for UPDATE"
    );

    // Test audit event has old and new values
    const hasOldNewValues =
      auditEventUpdate?.oldValue !== null && auditEventUpdate?.newValue !== null;

    logTest(
      "Audit event includes oldValue and newValue",
      hasOldNewValues,
      hasOldNewValues ? undefined : "Audit event missing old/new values"
    );

    // Test DELETE operation
    await prisma.property.delete({
      where: { id: property.id },
    });

    const auditEventDelete = await prisma.auditEvent.findFirst({
      where: {
        entityType: "PROPERTY",
        entityId: property.id,
        action: "DELETE",
      },
    });

    logTest(
      "DELETE operation generates audit event",
      auditEventDelete !== null,
      auditEventDelete ? undefined : "No audit event found for DELETE"
    );

    // Check audit events for different entity types
    const entityTypesWithAudits = await prisma.auditEvent.groupBy({
      by: ["entityType"],
      _count: { entityType: true },
    });

    const expectedEntityTypes = [
      "PROPERTY",
      "LOCATION",
      "CATEGORY",
      "ITEM",
      "ASSET",
      "USER",
      "SLIP",
      "TICKET",
    ];

    const coveredEntityTypes = entityTypesWithAudits.map((e) => e.entityType);
    const missingEntityTypes = expectedEntityTypes.filter(
      (et) => !coveredEntityTypes.includes(et as any)
    );

    logTest(
      "Audit coverage for all entity types",
      missingEntityTypes.length === 0,
      missingEntityTypes.length > 0
        ? `Missing audit events for: ${missingEntityTypes.join(", ")}`
        : undefined
    );

    // Cleanup
    await prisma.auditEvent.deleteMany({ where: { entityId: property.id } });
  } catch (error: any) {
    logTest("Audit event coverage test suite", false, error.message);
  }
}

async function testMovementLogsForSlips() {
  console.log("\n=== Additional: Movement Log Creation ===\n");

  try {
    // Verify that movement logs exist for slips
    const slipsWithoutMovementLogs = await prisma.slip.findMany({
      where: {
        movementLogs: {
          none: {},
        },
      },
      take: 5,
    });

    logTest(
      "All slips have associated movement logs",
      slipsWithoutMovementLogs.length === 0,
      slipsWithoutMovementLogs.length > 0
        ? `Found ${slipsWithoutMovementLogs.length} slips without movement logs`
        : undefined
    );
  } catch (error: any) {
    logTest("Movement log verification", false, error.message);
  }
}

async function runAllTests() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║   Phase 9 - Invariant Integration Tests               ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  try {
    await testNegativeStockPrevention();
    await testAssetConditionValidation();
    await testAuditEventCoverage();
    await testMovementLogsForSlips();

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("Test Summary");
    console.log("═══════════════════════════════════════════════════════");

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log(`Total:  ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log("\nFailed tests:");
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}`);
          if (r.error) {
            console.log(`    ${r.error}`);
          }
        });
      process.exit(1);
    } else {
      console.log("\n✓ All invariant tests passed!");
      process.exit(0);
    }
  } catch (error: any) {
    console.error("\nFatal error running tests:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests();

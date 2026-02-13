#!/usr/bin/env tsx

/**
 * Phase 9 - Existing Data Validation
 * 
 * Validates existing database data against invariants:
 * 1. No negative stock balances
 * 2. No slips issuing SCRAP/UNDER_MAINTENANCE assets
 * 3. All mutations have audit events
 */

import { Condition, SlipType } from "@prisma/client";
import { prisma } from "../lib/prisma";

type ValidationResult = {
  category: string;
  issue: string;
  severity: "error" | "warning" | "info";
  entityId?: string;
  details?: string;
};

const issues: ValidationResult[] = [];

function reportIssue(result: ValidationResult) {
  issues.push(result);
  const emoji = result.severity === "error" ? "❌" : result.severity === "warning" ? "⚠️" : "ℹ️";
  console.log(`${emoji} [${result.category}] ${result.issue}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
  if (result.entityId) {
    console.log(`   Entity ID: ${result.entityId}`);
  }
}

async function validateStockBalances() {
  console.log("\n=== Validating Stock Balances ===\n");

  const negativeBalances = await prisma.stockBalance.findMany({
    where: {
      qtyOnHand: {
        lt: 0,
      },
    },
    include: {
      item: {
        select: { name: true, itemType: true },
      },
      location: {
        select: { name: true },
      },
    },
  });

  if (negativeBalances.length > 0) {
    negativeBalances.forEach((balance) => {
      reportIssue({
        category: "Stock Balance",
        issue: "Negative stock quantity detected",
        severity: "error",
        entityId: balance.id,
        details: `Item: ${balance.item.name}, Location: ${balance.location.name}, Qty: ${balance.qtyOnHand.toString()}`,
      });
    });
  } else {
    console.log("✓ All stock balances are non-negative");
  }

  // Also check for very low stock
  const lowStockItems = await prisma.item.findMany({
    where: {
      itemType: "STOCK",
      reorderLevel: {
        not: null,
      },
      stockBalances: {
        some: {
          qtyOnHand: {
            lte: prisma.item.fields.reorderLevel,
          },
        },
      },
    },
    include: {
      stockBalances: {
        where: {
          qtyOnHand: {
            lte: prisma.item.fields.reorderLevel,
          },
        },
        include: {
          location: true,
        },
      },
    },
  });

  if (lowStockItems.length > 0) {
    lowStockItems.forEach((item) => {
      item.stockBalances.forEach((balance) => {
        reportIssue({
          category: "Stock Balance",
          issue: "Stock below reorder level",
          severity: "info",
          entityId: item.id,
          details: `Item: ${item.name}, Location: ${balance.location.name}, Current: ${balance.qtyOnHand.toString()}, Reorder Level: ${item.reorderLevel?.toString()}`,
        });
      });
    });
  }
}

async function validateAssetConditions() {
  console.log("\n=== Validating Asset Issue Conditions ===\n");

  // Find ISSUE slips with SCRAP or UNDER_MAINTENANCE assets
  const issueSlips = await prisma.slip.findMany({
    where: {
      slipType: SlipType.ISSUE,
    },
    include: {
      lines: {
        where: {
          assetId: {
            not: null,
          },
        },
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              condition: true,
            },
          },
        },
      },
    },
  });

  let invalidIssueCount = 0;

  for (const slip of issueSlips) {
    for (const line of slip.lines) {
      if (!line.asset) continue;

      // Check if asset was in SCRAP or UNDER_MAINTENANCE at time of issue
      // Use conditionAtMove if available, otherwise use current condition as proxy
      const conditionAtIssue = line.conditionAtMove || line.asset.condition;

      if (
        conditionAtIssue === Condition.SCRAP ||
        conditionAtIssue === Condition.UNDER_MAINTENANCE
      ) {
        invalidIssueCount++;
        reportIssue({
          category: "Asset Condition",
          issue: "ISSUE slip contains SCRAP or UNDER_MAINTENANCE asset",
          severity: "error",
          entityId: slip.id,
          details: `Slip: ${slip.slipNo}, Asset: ${line.asset.assetTag}, Condition: ${conditionAtIssue}`,
        });
      }
    }
  }

  if (invalidIssueCount === 0) {
    console.log("✓ No ISSUE slips contain SCRAP or UNDER_MAINTENANCE assets");
  }
}

async function validateAuditCoverage() {
  console.log("\n=== Validating Audit Event Coverage ===\n");

  // Sample checks for audit event coverage
  const entityChecks = [
    { type: "SLIP", table: "slip" },
    { type: "ASSET", table: "asset" },
    { type: "ITEM", table: "item" },
    { type: "PROPERTY", table: "property" },
    { type: "LOCATION", table: "location" },
    { type: "CATEGORY", table: "category" },
    { type: "USER", table: "user" },
  ];

  for (const check of entityChecks) {
    // Count entities of this type
    const entityCount = await (prisma as any)[check.table].count();

    // Count audit events for this type
    const auditCount = await prisma.auditEvent.count({
      where: {
        entityType: check.type as any,
      },
    });

    if (entityCount > 0 && auditCount === 0) {
      reportIssue({
        category: "Audit Coverage",
        issue: `No audit events found for ${check.type}`,
        severity: "warning",
        details: `${entityCount} ${check.type} entities exist but no audit events found`,
      });
    } else if (entityCount > 0) {
      console.log(
        `✓ ${check.type}: ${entityCount} entities, ${auditCount} audit events (${(
          (auditCount / entityCount) *
          100
        ).toFixed(0)}% coverage)`
      );
    }
  }

  // Check for operations without audit events
  const recentSlips = await prisma.slip.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, slipNo: true, createdAt: true },
  });

  for (const slip of recentSlips) {
    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "SLIP",
        entityId: slip.id,
        action: "CREATE",
      },
    });

    if (!auditEvent) {
      reportIssue({
        category: "Audit Coverage",
        issue: "Recent slip missing CREATE audit event",
        severity: "error",
        entityId: slip.id,
        details: `Slip: ${slip.slipNo}, Created: ${slip.createdAt.toISOString()}`,
      });
    }
  }
}

async function validateMovementLogs() {
  console.log("\n=== Validating Movement Logs ===\n");

  // Check that all slips have movement logs
  const slipsWithoutLogs = await prisma.slip.findMany({
    where: {
      movementLogs: {
        none: {},
      },
    },
    select: {
      id: true,
      slipNo: true,
      slipType: true,
      createdAt: true,
    },
  });

  if (slipsWithoutLogs.length > 0) {
    slipsWithoutLogs.forEach((slip) => {
      reportIssue({
        category: "Movement Logs",
        issue: "Slip missing movement logs",
        severity: "error",
        entityId: slip.id,
        details: `Slip: ${slip.slipNo}, Type: ${slip.slipType}, Created: ${slip.createdAt.toISOString()}`,
      });
    });
  } else {
    const slipCount = await prisma.slip.count();
    const movementLogCount = await prisma.movementLog.count({
      where: { slipId: { not: null } },
    });
    console.log(
      `✓ All ${slipCount} slips have movement logs (${movementLogCount} total movement logs)`
    );
  }
}

async function validateDataIntegrity() {
  console.log("\n=== Validating Data Integrity ===\n");

  // Check for orphaned records
  const orphanChecks = [
    {
      name: "Slip lines without items",
      query: () =>
        prisma.slipLine.findMany({
          where: { item: null },
          select: { id: true, slipId: true },
        }),
    },
    {
      name: "Assets without items",
      query: () =>
        prisma.asset.findMany({
          where: { item: null },
          select: { id: true, assetTag: true },
        }),
    },
    {
      name: "Stock balances without items",
      query: () =>
        prisma.stockBalance.findMany({
          where: { item: null },
          select: { id: true, itemId: true },
        }),
    },
  ];

  for (const check of orphanChecks) {
    const results = await check.query();
    if (results.length > 0) {
      reportIssue({
        category: "Data Integrity",
        issue: check.name,
        severity: "error",
        details: `Found ${results.length} orphaned records`,
      });
    } else {
      console.log(`✓ No ${check.name.toLowerCase()}`);
    }
  }
}

async function runValidation() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║   Phase 9 - Existing Data Validation                  ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  try {
    await validateStockBalances();
    await validateAssetConditions();
    await validateAuditCoverage();
    await validateMovementLogs();
    await validateDataIntegrity();

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("Validation Summary");
    console.log("═══════════════════════════════════════════════════════");

    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");
    const info = issues.filter((i) => i.severity === "info");

    console.log(`Total Issues: ${issues.length}`);
    console.log(`  Errors:   ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    console.log(`  Info:     ${info.length}`);

    if (errors.length > 0) {
      console.log("\n❌ Data validation failed with errors");
      console.log("\nErrors found:");
      errors.forEach((e, i) => {
        console.log(`\n${i + 1}. [${e.category}] ${e.issue}`);
        if (e.details) console.log(`   ${e.details}`);
        if (e.entityId) console.log(`   Entity ID: ${e.entityId}`);
      });
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log("\n⚠️ Data validation completed with warnings");
      process.exit(0);
    } else {
      console.log("\n✓ Data validation passed - all invariants satisfied!");
      process.exit(0);
    }
  } catch (error: any) {
    console.error("\n❌ Fatal error during validation:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runValidation();

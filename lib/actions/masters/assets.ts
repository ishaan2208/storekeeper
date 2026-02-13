"use server";

import { AuditAction, Condition, EntityType } from "@prisma/client";
import { z } from "zod";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { writeAuditEvent } from "@/lib/actions/audit";
import { prisma } from "@/lib/prisma";
import { assertPermission, canManageMasters } from "@/lib/permissions";

const createAssetSchema = z.object({
  itemId: z.string().cuid(),
  assetTag: z.string().trim().min(1).max(100),
  serialNumber: z.string().trim().max(100).optional(),
  purchaseDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  warrantyUntil: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  condition: z.nativeEnum(Condition).default(Condition.NEW),
  currentLocationId: z.string().cuid().optional(),
  notes: z.string().max(500).optional(),
});

const updateAssetSchema = z.object({
  id: z.string().cuid(),
  itemId: z.string().cuid(),
  assetTag: z.string().trim().min(1).max(100),
  serialNumber: z.string().trim().max(100).optional(),
  purchaseDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  warrantyUntil: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  condition: z.nativeEnum(Condition),
  currentLocationId: z.string().cuid().optional(),
  notes: z.string().max(500).optional(),
});

export async function createAsset(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage assets.");

  const parsed = createAssetSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({
      where: { id: parsed.itemId },
    });

    if (!item) {
      throw new Error("Item not found.");
    }

    if (parsed.currentLocationId) {
      const location = await tx.location.findUnique({
        where: { id: parsed.currentLocationId },
      });

      if (!location) {
        throw new Error("Location not found.");
      }
    }

    const existingAsset = await tx.asset.findUnique({
      where: { assetTag: parsed.assetTag },
    });

    if (existingAsset) {
      throw new Error("Asset tag already exists.");
    }

    const asset = await tx.asset.create({
      data: {
        itemId: parsed.itemId,
        assetTag: parsed.assetTag,
        serialNumber: parsed.serialNumber,
        purchaseDate: parsed.purchaseDate,
        warrantyUntil: parsed.warrantyUntil,
        condition: parsed.condition,
        currentLocationId: parsed.currentLocationId,
        notes: parsed.notes,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.ASSET,
      entityId: asset.id,
      action: AuditAction.CREATE,
      newValue: {
        itemId: asset.itemId,
        assetTag: asset.assetTag,
        serialNumber: asset.serialNumber,
        purchaseDate: asset.purchaseDate?.toISOString(),
        warrantyUntil: asset.warrantyUntil?.toISOString(),
        condition: asset.condition,
        currentLocationId: asset.currentLocationId,
        notes: asset.notes,
      },
      createdById: session.id,
    });

    return asset;
  });
}

export async function updateAsset(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage assets.");

  const parsed = updateAssetSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const oldAsset = await tx.asset.findUnique({
      where: { id: parsed.id },
    });

    if (!oldAsset) {
      throw new Error("Asset not found.");
    }

    const item = await tx.item.findUnique({
      where: { id: parsed.itemId },
    });

    if (!item) {
      throw new Error("Item not found.");
    }

    if (parsed.currentLocationId) {
      const location = await tx.location.findUnique({
        where: { id: parsed.currentLocationId },
      });

      if (!location) {
        throw new Error("Location not found.");
      }
    }

    if (parsed.assetTag !== oldAsset.assetTag) {
      const existingAsset = await tx.asset.findUnique({
        where: { assetTag: parsed.assetTag },
      });

      if (existingAsset) {
        throw new Error("Asset tag already exists.");
      }
    }

    const asset = await tx.asset.update({
      where: { id: parsed.id },
      data: {
        itemId: parsed.itemId,
        assetTag: parsed.assetTag,
        serialNumber: parsed.serialNumber,
        purchaseDate: parsed.purchaseDate,
        warrantyUntil: parsed.warrantyUntil,
        condition: parsed.condition,
        currentLocationId: parsed.currentLocationId,
        notes: parsed.notes,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.ASSET,
      entityId: asset.id,
      action: AuditAction.UPDATE,
      oldValue: {
        itemId: oldAsset.itemId,
        assetTag: oldAsset.assetTag,
        serialNumber: oldAsset.serialNumber,
        purchaseDate: oldAsset.purchaseDate?.toISOString(),
        warrantyUntil: oldAsset.warrantyUntil?.toISOString(),
        condition: oldAsset.condition,
        currentLocationId: oldAsset.currentLocationId,
        notes: oldAsset.notes,
      },
      newValue: {
        itemId: asset.itemId,
        assetTag: asset.assetTag,
        serialNumber: asset.serialNumber,
        purchaseDate: asset.purchaseDate?.toISOString(),
        warrantyUntil: asset.warrantyUntil?.toISOString(),
        condition: asset.condition,
        currentLocationId: asset.currentLocationId,
        notes: asset.notes,
      },
      createdById: session.id,
    });

    return asset;
  });
}

export async function deleteAsset(id: string) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage assets.");

  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { id },
      include: {
        slipLines: { select: { id: true } },
        maintenanceTickets: { select: { id: true } },
        movementLogs: { select: { id: true } },
      },
    });

    if (!asset) {
      throw new Error("Asset not found.");
    }

    if (asset.slipLines.length > 0 || asset.maintenanceTickets.length > 0 || asset.movementLogs.length > 0) {
      throw new Error("Cannot delete asset with transaction history or maintenance records.");
    }

    await tx.asset.delete({
      where: { id },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.ASSET,
      entityId: id,
      action: AuditAction.DELETE,
      oldValue: {
        itemId: asset.itemId,
        assetTag: asset.assetTag,
        serialNumber: asset.serialNumber,
        purchaseDate: asset.purchaseDate?.toISOString(),
        warrantyUntil: asset.warrantyUntil?.toISOString(),
        condition: asset.condition,
        currentLocationId: asset.currentLocationId,
        notes: asset.notes,
      },
      createdById: session.id,
    });
  });
}

"use server";

import { AuditAction, EntityType, ItemType } from "@prisma/client";
import { z } from "zod";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { writeAuditEvent } from "@/lib/actions/audit";
import { prisma } from "@/lib/prisma";
import { assertPermission, canManageMasters } from "@/lib/permissions";

const createItemSchema = z.object({
  name: z.string().trim().min(2).max(100),
  itemType: z.nativeEnum(ItemType),
  categoryId: z.string().cuid(),
  unit: z.string().trim().max(50).optional(),
  reorderLevel: z.number().nonnegative().optional(),
  isActive: z.boolean().default(true),
});

const updateItemSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(2).max(100),
  itemType: z.nativeEnum(ItemType),
  categoryId: z.string().cuid(),
  unit: z.string().trim().max(50).optional(),
  reorderLevel: z.number().nonnegative().optional(),
  isActive: z.boolean(),
});

export async function createItem(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage items.");

  const parsed = createItemSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: { id: parsed.categoryId },
    });

    if (!category) {
      throw new Error("Category not found.");
    }

    const item = await tx.item.create({
      data: {
        name: parsed.name,
        itemType: parsed.itemType,
        categoryId: parsed.categoryId,
        unit: parsed.unit,
        reorderLevel: parsed.reorderLevel,
        isActive: parsed.isActive,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.ITEM,
      entityId: item.id,
      action: AuditAction.CREATE,
      newValue: {
        name: item.name,
        itemType: item.itemType,
        categoryId: item.categoryId,
        unit: item.unit,
        reorderLevel: item.reorderLevel?.toNumber(),
        isActive: item.isActive,
      },
      createdById: session.id,
    });

    return item;
  });
}

export async function updateItem(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage items.");

  const parsed = updateItemSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const oldItem = await tx.item.findUnique({
      where: { id: parsed.id },
    });

    if (!oldItem) {
      throw new Error("Item not found.");
    }

    const category = await tx.category.findUnique({
      where: { id: parsed.categoryId },
    });

    if (!category) {
      throw new Error("Category not found.");
    }

    const item = await tx.item.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        itemType: parsed.itemType,
        categoryId: parsed.categoryId,
        unit: parsed.unit,
        reorderLevel: parsed.reorderLevel,
        isActive: parsed.isActive,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.ITEM,
      entityId: item.id,
      action: AuditAction.UPDATE,
      oldValue: {
        name: oldItem.name,
        itemType: oldItem.itemType,
        categoryId: oldItem.categoryId,
        unit: oldItem.unit,
        reorderLevel: oldItem.reorderLevel?.toNumber(),
        isActive: oldItem.isActive,
      },
      newValue: {
        name: item.name,
        itemType: item.itemType,
        categoryId: item.categoryId,
        unit: item.unit,
        reorderLevel: item.reorderLevel?.toNumber(),
        isActive: item.isActive,
      },
      createdById: session.id,
    });

    return item;
  });
}

export async function deleteItem(id: string) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage items.");

  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({
      where: { id },
      include: {
        assets: { select: { id: true } },
        stockBalances: { select: { id: true } },
        slipLines: { select: { id: true } },
        movementLogs: { select: { id: true } },
      },
    });

    if (!item) {
      throw new Error("Item not found.");
    }

    if (
      item.assets.length > 0 ||
      item.stockBalances.length > 0 ||
      item.slipLines.length > 0 ||
      item.movementLogs.length > 0
    ) {
      throw new Error("Cannot delete item with associated assets, stock balances, or transaction history.");
    }

    await tx.item.delete({
      where: { id },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.ITEM,
      entityId: id,
      action: AuditAction.DELETE,
      oldValue: {
        name: item.name,
        itemType: item.itemType,
        categoryId: item.categoryId,
        unit: item.unit,
        reorderLevel: item.reorderLevel?.toNumber(),
        isActive: item.isActive,
      },
      createdById: session.id,
    });
  });
}

"use server";

import { AuditAction, EntityType } from "@prisma/client";
import { z } from "zod";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { writeAuditEvent } from "@/lib/actions/audit";
import { prisma } from "@/lib/prisma";
import { assertPermission, canManageMasters } from "@/lib/permissions";

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  parentCategoryId: z.string().cuid().optional(),
});

const updateCategorySchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(2).max(100),
  parentCategoryId: z.string().cuid().optional(),
});

export async function createCategory(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage categories.");

  const parsed = createCategorySchema.parse(input);

  return prisma.$transaction(async (tx) => {
    if (parsed.parentCategoryId) {
      const parentCategory = await tx.category.findUnique({
        where: { id: parsed.parentCategoryId },
      });

      if (!parentCategory) {
        throw new Error("Parent category not found.");
      }
    }

    const category = await tx.category.create({
      data: {
        name: parsed.name,
        parentCategoryId: parsed.parentCategoryId,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.CATEGORY,
      entityId: category.id,
      action: AuditAction.CREATE,
      newValue: {
        name: category.name,
        parentCategoryId: category.parentCategoryId,
      },
      createdById: session.id,
    });

    return category;
  });
}

export async function updateCategory(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage categories.");

  const parsed = updateCategorySchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const oldCategory = await tx.category.findUnique({
      where: { id: parsed.id },
    });

    if (!oldCategory) {
      throw new Error("Category not found.");
    }

    if (parsed.parentCategoryId) {
      if (parsed.parentCategoryId === parsed.id) {
        throw new Error("Category cannot be its own parent.");
      }

      const parentCategory = await tx.category.findUnique({
        where: { id: parsed.parentCategoryId },
      });

      if (!parentCategory) {
        throw new Error("Parent category not found.");
      }
    }

    const category = await tx.category.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        parentCategoryId: parsed.parentCategoryId,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.CATEGORY,
      entityId: category.id,
      action: AuditAction.UPDATE,
      oldValue: {
        name: oldCategory.name,
        parentCategoryId: oldCategory.parentCategoryId,
      },
      newValue: {
        name: category.name,
        parentCategoryId: category.parentCategoryId,
      },
      createdById: session.id,
    });

    return category;
  });
}

export async function deleteCategory(id: string) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage categories.");

  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } },
        items: { select: { id: true } },
      },
    });

    if (!category) {
      throw new Error("Category not found.");
    }

    if (category.children.length > 0 || category.items.length > 0) {
      throw new Error("Cannot delete category with associated subcategories or items.");
    }

    await tx.category.delete({
      where: { id },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.CATEGORY,
      entityId: id,
      action: AuditAction.DELETE,
      oldValue: {
        name: category.name,
        parentCategoryId: category.parentCategoryId,
      },
      createdById: session.id,
    });
  });
}

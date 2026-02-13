"use server";

import { AuditAction, EntityType } from "@prisma/client";
import { z } from "zod";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { writeAuditEvent } from "@/lib/actions/audit";
import { prisma } from "@/lib/prisma";
import { assertPermission, canManageMasters } from "@/lib/permissions";

const createPropertySchema = z.object({
  name: z.string().trim().min(2).max(100),
});

const updatePropertySchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(2).max(100),
});

export async function createProperty(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage properties.");

  const parsed = createPropertySchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        name: parsed.name,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.PROPERTY,
      entityId: property.id,
      action: AuditAction.CREATE,
      newValue: {
        name: property.name,
      },
      createdById: session.id,
    });

    return property;
  });
}

export async function updateProperty(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage properties.");

  const parsed = updatePropertySchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const oldProperty = await tx.property.findUnique({
      where: { id: parsed.id },
    });

    if (!oldProperty) {
      throw new Error("Property not found.");
    }

    const property = await tx.property.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.PROPERTY,
      entityId: property.id,
      action: AuditAction.UPDATE,
      oldValue: {
        name: oldProperty.name,
      },
      newValue: {
        name: property.name,
      },
      createdById: session.id,
    });

    return property;
  });
}

export async function deleteProperty(id: string) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage properties.");

  return prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id },
      include: {
        locations: { select: { id: true } },
        slips: { select: { id: true } },
      },
    });

    if (!property) {
      throw new Error("Property not found.");
    }

    if (property.locations.length > 0 || property.slips.length > 0) {
      throw new Error("Cannot delete property with associated locations or slips.");
    }

    await tx.property.delete({
      where: { id },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.PROPERTY,
      entityId: id,
      action: AuditAction.DELETE,
      oldValue: {
        name: property.name,
      },
      createdById: session.id,
    });
  });
}

"use server";

import { AuditAction, EntityType } from "@prisma/client";
import { z } from "zod";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { writeAuditEvent } from "@/lib/actions/audit";
import { prisma } from "@/lib/prisma";
import { assertPermission, canManageMasters } from "@/lib/permissions";

const createLocationSchema = z.object({
  propertyId: z.string().cuid(),
  name: z.string().trim().min(2).max(100),
  floor: z.string().trim().max(50).optional(),
  room: z.string().trim().max(50).optional(),
  area: z.string().trim().max(50).optional(),
});

const updateLocationSchema = z.object({
  id: z.string().cuid(),
  propertyId: z.string().cuid(),
  name: z.string().trim().min(2).max(100),
  floor: z.string().trim().max(50).optional(),
  room: z.string().trim().max(50).optional(),
  area: z.string().trim().max(50).optional(),
});

export async function createLocation(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage locations.");

  const parsed = createLocationSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id: parsed.propertyId },
    });

    if (!property) {
      throw new Error("Property not found.");
    }

    const location = await tx.location.create({
      data: {
        propertyId: parsed.propertyId,
        name: parsed.name,
        floor: parsed.floor,
        room: parsed.room,
        area: parsed.area,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.LOCATION,
      entityId: location.id,
      action: AuditAction.CREATE,
      newValue: {
        propertyId: location.propertyId,
        name: location.name,
        floor: location.floor,
        room: location.room,
        area: location.area,
      },
      createdById: session.id,
    });

    return location;
  });
}

export async function updateLocation(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage locations.");

  const parsed = updateLocationSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const oldLocation = await tx.location.findUnique({
      where: { id: parsed.id },
    });

    if (!oldLocation) {
      throw new Error("Location not found.");
    }

    const property = await tx.property.findUnique({
      where: { id: parsed.propertyId },
    });

    if (!property) {
      throw new Error("Property not found.");
    }

    const location = await tx.location.update({
      where: { id: parsed.id },
      data: {
        propertyId: parsed.propertyId,
        name: parsed.name,
        floor: parsed.floor,
        room: parsed.room,
        area: parsed.area,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.LOCATION,
      entityId: location.id,
      action: AuditAction.UPDATE,
      oldValue: {
        propertyId: oldLocation.propertyId,
        name: oldLocation.name,
        floor: oldLocation.floor,
        room: oldLocation.room,
        area: oldLocation.area,
      },
      newValue: {
        propertyId: location.propertyId,
        name: location.name,
        floor: location.floor,
        room: location.room,
        area: location.area,
      },
      createdById: session.id,
    });

    return location;
  });
}

export async function deleteLocation(id: string) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageMasters(session.role), "You do not have permission to manage locations.");

  return prisma.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id },
      include: {
        assets: { select: { id: true } },
        stockBalances: { select: { id: true } },
        fromSlips: { select: { id: true } },
        toSlips: { select: { id: true } },
      },
    });

    if (!location) {
      throw new Error("Location not found.");
    }

    if (
      location.assets.length > 0 ||
      location.stockBalances.length > 0 ||
      location.fromSlips.length > 0 ||
      location.toSlips.length > 0
    ) {
      throw new Error("Cannot delete location with associated assets, stock, or slips.");
    }

    await tx.location.delete({
      where: { id },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.LOCATION,
      entityId: id,
      action: AuditAction.DELETE,
      oldValue: {
        propertyId: location.propertyId,
        name: location.name,
        floor: location.floor,
        room: location.room,
        area: location.area,
      },
      createdById: session.id,
    });
  });
}

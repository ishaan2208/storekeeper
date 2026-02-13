"use server";

import { AuditAction, EntityType, Role } from "@prisma/client";
import { z } from "zod";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { writeAuditEvent } from "@/lib/actions/audit";
import { prisma } from "@/lib/prisma";
import { assertPermission, canManageUsers } from "@/lib/permissions";

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional(),
  role: z.nativeEnum(Role),
});

const updateUserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional(),
  role: z.nativeEnum(Role),
});

export async function createUser(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageUsers(session.role), "You do not have permission to manage users.");

  const parsed = createUserSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.name,
        phone: parsed.phone,
        role: parsed.role,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.USER,
      entityId: user.id,
      action: AuditAction.CREATE,
      newValue: {
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      createdById: session.id,
    });

    return user;
  });
}

export async function updateUser(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageUsers(session.role), "You do not have permission to manage users.");

  const parsed = updateUserSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const oldUser = await tx.user.findUnique({
      where: { id: parsed.id },
    });

    if (!oldUser) {
      throw new Error("User not found.");
    }

    const user = await tx.user.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        phone: parsed.phone,
        role: parsed.role,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.USER,
      entityId: user.id,
      action: AuditAction.UPDATE,
      oldValue: {
        name: oldUser.name,
        phone: oldUser.phone,
        role: oldUser.role,
      },
      newValue: {
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      createdById: session.id,
    });

    return user;
  });
}

export async function deleteUser(id: string) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageUsers(session.role), "You do not have permission to manage users.");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id },
      include: {
        requestedSlips: { select: { id: true } },
        issuedSlips: { select: { id: true } },
        receivedSlips: { select: { id: true } },
        signedSignatures: { select: { id: true } },
        createdTickets: { select: { id: true } },
        maintenanceLogs: { select: { id: true } },
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (
      user.requestedSlips.length > 0 ||
      user.issuedSlips.length > 0 ||
      user.receivedSlips.length > 0 ||
      user.signedSignatures.length > 0 ||
      user.createdTickets.length > 0 ||
      user.maintenanceLogs.length > 0
    ) {
      throw new Error("Cannot delete user with associated slips, signatures, tickets, or logs.");
    }

    await tx.user.delete({
      where: { id },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.USER,
      entityId: id,
      action: AuditAction.DELETE,
      oldValue: {
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      createdById: session.id,
    });
  });
}

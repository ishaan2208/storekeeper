"use server";

import {
  AuditAction,
  Condition,
  EntityType,
  MaintenanceStatus,
  MovementType,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { writeAuditEvent } from "@/lib/actions/audit";
import { prisma } from "@/lib/prisma";
import { assertPermission, canCloseMaintenance } from "@/lib/permissions";

type TxClient = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const createMaintenanceTicketSchema = z.object({
  assetId: z.string().cuid(),
  problemText: z.string().trim().min(10).max(1000),
  vendorName: z.string().trim().min(2).max(200).optional(),
  estimatedCost: z.number().positive().optional(),
});

const updateMaintenanceStatusSchema = z.object({
  ticketId: z.string().cuid(),
  status: z.nativeEnum(MaintenanceStatus),
  note: z.string().trim().min(1).max(500).optional(),
  vendorName: z.string().trim().min(2).max(200).optional(),
  estimatedCost: z.number().positive().optional(),
  actualCost: z.number().positive().optional(),
});

const closeTicketSchema = z.object({
  ticketId: z.string().cuid(),
  note: z.string().trim().min(1).max(500).optional(),
  actualCost: z.number().positive().optional(),
  finalCondition: z.nativeEnum(Condition).optional(),
});

async function createMaintOutMovement(
  tx: TxClient,
  assetId: string,
  note?: string,
): Promise<void> {
  const asset = await tx.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      itemId: true,
      currentLocationId: true,
      condition: true,
    },
  });

  if (!asset) {
    throw new Error("Asset not found.");
  }

  // Update asset condition to UNDER_MAINTENANCE
  await tx.asset.update({
    where: { id: assetId },
    data: { condition: Condition.UNDER_MAINTENANCE },
  });

  // Create MAINT_OUT movement log
  await tx.movementLog.create({
    data: {
      movementType: MovementType.MAINT_OUT,
      itemId: asset.itemId,
      assetId: asset.id,
      fromLocationId: asset.currentLocationId,
      condition: Condition.UNDER_MAINTENANCE,
      note: note ?? "Sent to maintenance",
    },
  });
}

async function createMaintInMovement(
  tx: TxClient,
  assetId: string,
  targetLocationId: string | null,
  finalCondition: Condition,
  note?: string,
): Promise<void> {
  const asset = await tx.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      itemId: true,
      currentLocationId: true,
    },
  });

  if (!asset) {
    throw new Error("Asset not found.");
  }

  // Update asset condition and location
  await tx.asset.update({
    where: { id: assetId },
    data: {
      condition: finalCondition,
      currentLocationId: targetLocationId ?? asset.currentLocationId,
    },
  });

  // Create MAINT_IN movement log
  await tx.movementLog.create({
    data: {
      movementType: MovementType.MAINT_IN,
      itemId: asset.itemId,
      assetId: asset.id,
      toLocationId: targetLocationId ?? asset.currentLocationId,
      condition: finalCondition,
      note: note ?? "Returned from maintenance",
    },
  });
}

export async function createMaintenanceTicket(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(
    canCloseMaintenance(session.role),
    "You do not have permission to create maintenance tickets.",
  );

  const parsed = createMaintenanceTicketSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    // Verify asset exists and is not already scrapped
    const asset = await tx.asset.findUnique({
      where: { id: parsed.assetId },
      select: {
        id: true,
        assetTag: true,
        condition: true,
        item: { select: { name: true } },
      },
    });

    if (!asset) {
      throw new Error("Selected asset does not exist.");
    }

    if (asset.condition === Condition.SCRAP) {
      throw new Error("Cannot create maintenance ticket for scrapped asset.");
    }

    // Check if there's already an open ticket for this asset
    const existingTicket = await tx.maintenanceTicket.findFirst({
      where: {
        assetId: parsed.assetId,
        status: {
          notIn: [MaintenanceStatus.CLOSED, MaintenanceStatus.SCRAPPED],
        },
      },
    });

    if (existingTicket) {
      throw new Error("Asset already has an open maintenance ticket.");
    }

    // Create the ticket
    const ticket = await tx.maintenanceTicket.create({
      data: {
        assetId: parsed.assetId,
        status: MaintenanceStatus.REPORTED,
        problemText: parsed.problemText,
        vendorName: parsed.vendorName,
        estimatedCost: parsed.estimatedCost
          ? new Prisma.Decimal(parsed.estimatedCost)
          : null,
        createdById: session.id,
      },
    });

    // Create initial log entry
    await tx.maintenanceLog.create({
      data: {
        ticketId: ticket.id,
        status: MaintenanceStatus.REPORTED,
        note: parsed.problemText,
        createdById: session.id,
      },
    });

    // Create MAINT_OUT movement
    await createMaintOutMovement(tx, parsed.assetId, `Ticket #${ticket.id.slice(-6)}`);

    // Audit event
    await writeAuditEvent(tx, {
      entityType: EntityType.TICKET,
      entityId: ticket.id,
      action: AuditAction.CREATE,
      newValue: {
        assetTag: asset.assetTag,
        status: ticket.status,
        problemText: parsed.problemText,
      },
      createdById: session.id,
    });

    return ticket;
  });
}

export async function updateMaintenanceStatus(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(
    canCloseMaintenance(session.role),
    "You do not have permission to update maintenance tickets.",
  );

  const parsed = updateMaintenanceStatusSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.findUnique({
      where: { id: parsed.ticketId },
      include: {
        asset: {
          select: { assetTag: true, condition: true },
        },
      },
    });

    if (!ticket) {
      throw new Error("Maintenance ticket not found.");
    }

    if (ticket.status === MaintenanceStatus.CLOSED) {
      throw new Error("Cannot update a closed ticket. Use closeTicket instead.");
    }

    if (ticket.status === MaintenanceStatus.SCRAPPED) {
      throw new Error("Cannot update a scrapped ticket.");
    }

    // Validate status transitions
    const invalidTransitions: Record<MaintenanceStatus, MaintenanceStatus[]> = {
      [MaintenanceStatus.REPORTED]: [],
      [MaintenanceStatus.DIAGNOSING]: [],
      [MaintenanceStatus.SENT_TO_VENDOR]: [MaintenanceStatus.REPORTED],
      [MaintenanceStatus.IN_REPAIR]: [MaintenanceStatus.REPORTED],
      [MaintenanceStatus.FIXED]: [MaintenanceStatus.REPORTED],
      [MaintenanceStatus.CLOSED]: [],
      [MaintenanceStatus.UNREPAIRABLE]: [],
      [MaintenanceStatus.SCRAPPED]: [],
    };

    if (invalidTransitions[parsed.status]?.includes(ticket.status)) {
      throw new Error(`Cannot transition from ${ticket.status} to ${parsed.status}.`);
    }

    const oldStatus = ticket.status;

    // Update ticket
    const updateData: Prisma.MaintenanceTicketUpdateInput = {
      status: parsed.status,
    };

    if (parsed.vendorName !== undefined) {
      updateData.vendorName = parsed.vendorName;
    }

    if (parsed.estimatedCost !== undefined) {
      updateData.estimatedCost = new Prisma.Decimal(parsed.estimatedCost);
    }

    if (parsed.actualCost !== undefined) {
      updateData.actualCost = new Prisma.Decimal(parsed.actualCost);
    }

    const updatedTicket = await tx.maintenanceTicket.update({
      where: { id: parsed.ticketId },
      data: updateData,
    });

    // Create log entry
    await tx.maintenanceLog.create({
      data: {
        ticketId: ticket.id,
        status: parsed.status,
        note: parsed.note,
        createdById: session.id,
      },
    });

    // Audit event
    await writeAuditEvent(tx, {
      entityType: EntityType.TICKET,
      entityId: ticket.id,
      action: AuditAction.UPDATE,
      oldValue: {
        status: oldStatus,
      },
      newValue: {
        status: parsed.status,
        note: parsed.note,
      },
      createdById: session.id,
    });

    return updatedTicket;
  });
}

export async function closeTicket(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(
    canCloseMaintenance(session.role),
    "You do not have permission to close maintenance tickets.",
  );

  const parsed = closeTicketSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.findUnique({
      where: { id: parsed.ticketId },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            condition: true,
            currentLocationId: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new Error("Maintenance ticket not found.");
    }

    if (ticket.status === MaintenanceStatus.CLOSED) {
      throw new Error("Ticket is already closed.");
    }

    if (ticket.status === MaintenanceStatus.SCRAPPED) {
      throw new Error("Scrapped tickets cannot be closed normally.");
    }

    // Determine final condition
    let finalCondition = parsed.finalCondition;
    if (!finalCondition) {
      // Auto-determine based on status
      if (ticket.status === MaintenanceStatus.FIXED) {
        finalCondition = Condition.GOOD;
      } else if (ticket.status === MaintenanceStatus.UNREPAIRABLE) {
        finalCondition = Condition.DAMAGED;
      } else {
        // Default to current condition if no explicit condition provided
        finalCondition = ticket.asset.condition;
      }
    }

    // Update ticket
    const updateData: Prisma.MaintenanceTicketUpdateInput = {
      status: MaintenanceStatus.CLOSED,
      closedAt: new Date(),
    };

    if (parsed.actualCost !== undefined) {
      updateData.actualCost = new Prisma.Decimal(parsed.actualCost);
    }

    const closedTicket = await tx.maintenanceTicket.update({
      where: { id: parsed.ticketId },
      data: updateData,
    });

    // Create closing log entry
    await tx.maintenanceLog.create({
      data: {
        ticketId: ticket.id,
        status: MaintenanceStatus.CLOSED,
        note: parsed.note ?? "Ticket closed",
        createdById: session.id,
      },
    });

    // Create MAINT_IN movement - asset returns with updated condition
    await createMaintInMovement(
      tx,
      ticket.assetId,
      ticket.asset.currentLocationId,
      finalCondition,
      parsed.note ?? `Ticket #${ticket.id.slice(-6)} closed`,
    );

    // Audit event
    await writeAuditEvent(tx, {
      entityType: EntityType.TICKET,
      entityId: ticket.id,
      action: AuditAction.UPDATE,
      oldValue: {
        status: ticket.status,
        closedAt: null,
      },
      newValue: {
        status: MaintenanceStatus.CLOSED,
        closedAt: closedTicket.closedAt,
        finalCondition,
      },
      createdById: session.id,
    });

    return closedTicket;
  });
}

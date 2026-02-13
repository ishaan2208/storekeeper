"use server";

import {
  AuditAction,
  Condition,
  DepartmentType,
  EntityType,
  ItemType,
  MovementType,
  Prisma,
  SignatureMethod,
  SlipType,
} from "@prisma/client";
import { z } from "zod";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { writeAuditEvent } from "@/lib/actions/audit";
import { prisma } from "@/lib/prisma";
import { assertPermission, canAdjustStock, canCreateSlip } from "@/lib/permissions";

const slipLineSchema = z
  .object({
    itemId: z.string().cuid(),
    itemType: z.nativeEnum(ItemType),
    assetId: z.string().cuid().optional(),
    qty: z.number().positive().optional(),
    conditionAtMove: z.nativeEnum(Condition).optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.itemType === ItemType.STOCK && value.qty === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quantity is required for stock items.",
        path: ["qty"],
      });
    }

    if (value.itemType === ItemType.ASSET && !value.assetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Asset selection is required for asset items.",
        path: ["assetId"],
      });
    }
  });

const signatureSchema = z.object({
  signedByName: z.string().trim().min(2).max(120),
  signedByUserId: z.string().cuid().optional(),
  method: z.nativeEnum(SignatureMethod).default(SignatureMethod.TYPED),
});

const createSlipInputSchema = z.object({
  slipType: z.enum([SlipType.RECEIVE, SlipType.ISSUE, SlipType.RETURN, SlipType.TRANSFER, SlipType.MAINT]),
  propertyId: z.string().cuid(),
  fromLocationId: z.string().cuid().optional(),
  toLocationId: z.string().cuid(),
  sourceSlipId: z.string().cuid().optional(),
  department: z.nativeEnum(DepartmentType),
  requestedById: z.string().cuid().optional(),
  issuedById: z.string().cuid().optional(),
  receivedById: z.string().cuid().optional(),
  vendorId: z.string().cuid().optional(),
  createdById: z.string().cuid().optional(),
  lines: z.array(slipLineSchema).min(1),
  signature: signatureSchema.optional(),
});

const addSignatureInputSchema = z.object({
  slipId: z.string().cuid(),
  signedByName: z.string().trim().min(2).max(120),
  signedByUserId: z.string().cuid().optional(),
  method: z.nativeEnum(SignatureMethod).default(SignatureMethod.TYPED),
  createdById: z.string().cuid().optional(),
});

type TxClient = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

function generateSlipNo(slipType: SlipType): string {
  const prefixByType: Record<SlipType, string> = {
    [SlipType.RECEIVE]: "RCV",
    [SlipType.ISSUE]: "ISS",
    [SlipType.RETURN]: "RET",
    [SlipType.TRANSFER]: "TRF",
    [SlipType.MAINT]: "MNT",
  };
  const prefix = prefixByType[slipType];
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 10_000)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${timestamp}-${random}`;
}

async function adjustStockOrThrow(
  tx: TxClient,
  itemId: string,
  locationId: string,
  delta: Prisma.Decimal,
): Promise<void> {
  const existing = await tx.stockBalance.findUnique({
    where: { itemId_locationId: { itemId, locationId } },
  });

  const currentQty = existing?.qtyOnHand ?? new Prisma.Decimal(0);
  const nextQty = currentQty.plus(delta);

  if (nextQty.isNegative()) {
    throw new Error("Stock cannot go negative for the source location.");
  }

  if (existing) {
    await tx.stockBalance.update({
      where: { id: existing.id },
      data: { qtyOnHand: nextQty },
    });
    return;
  }

  await tx.stockBalance.create({
    data: {
      itemId,
      locationId,
      qtyOnHand: nextQty,
    },
  });
}

function movementTypeForSlip(slipType: SlipType): MovementType {
  if (slipType === SlipType.RECEIVE) return MovementType.RECEIVE_IN;
  if (slipType === SlipType.ISSUE) return MovementType.ISSUE_OUT;
  if (slipType === SlipType.RETURN) return MovementType.RETURN_IN;
  if (slipType === SlipType.TRANSFER) return MovementType.TRANSFER;
  return MovementType.MAINT_OUT;
}

export async function createSlip(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canCreateSlip(session.role), "You do not have permission to create slips.");
  assertPermission(canAdjustStock(session.role), "You do not have permission to adjust stock.");

  const parsed = createSlipInputSchema.parse(input);

  if (parsed.sourceSlipId && parsed.slipType !== SlipType.RETURN) {
    throw new Error("Source slip can only be used while creating RETURN slips.");
  }

  return prisma.$transaction(async (tx) => {
    if (parsed.slipType === SlipType.RETURN && parsed.sourceSlipId) {
      const sourceSlip = await tx.slip.findUnique({
        where: { id: parsed.sourceSlipId },
        include: {
          lines: {
            select: {
              itemId: true,
              assetId: true,
              qty: true,
              item: { select: { itemType: true } },
            },
          },
        },
      });

      if (!sourceSlip) {
        throw new Error("Selected source issue slip does not exist.");
      }

      if (sourceSlip.slipType !== SlipType.ISSUE) {
        throw new Error("Only ISSUE slips can be used as a source for returns.");
      }

      if (sourceSlip.propertyId !== parsed.propertyId) {
        throw new Error("Return property must match the source issue slip property.");
      }

      if (
        sourceSlip.fromLocationId &&
        sourceSlip.toLocationId &&
        (parsed.fromLocationId !== sourceSlip.toLocationId ||
          parsed.toLocationId !== sourceSlip.fromLocationId)
      ) {
        throw new Error("Return locations must reverse the original issue locations.");
      }

      const sourceStockTotals = new Map<string, Prisma.Decimal>();
      const sourceAssets = new Set<string>();

      for (const sourceLine of sourceSlip.lines) {
        if (sourceLine.item.itemType === ItemType.STOCK && sourceLine.qty) {
          const current = sourceStockTotals.get(sourceLine.itemId) ?? new Prisma.Decimal(0);
          sourceStockTotals.set(sourceLine.itemId, current.plus(sourceLine.qty));
        }
        if (sourceLine.item.itemType === ItemType.ASSET && sourceLine.assetId) {
          sourceAssets.add(sourceLine.assetId);
        }
      }

      const returnStockTotals = new Map<string, Prisma.Decimal>();
      for (const returnLine of parsed.lines) {
        if (returnLine.itemType === ItemType.STOCK) {
          const current = returnStockTotals.get(returnLine.itemId) ?? new Prisma.Decimal(0);
          returnStockTotals.set(returnLine.itemId, current.plus(returnLine.qty ?? 0));
          continue;
        }

        if (returnLine.assetId && !sourceAssets.has(returnLine.assetId)) {
          throw new Error("Selected asset was not part of the source issue slip.");
        }
      }

      for (const itemId of Array.from(returnStockTotals.keys())) {
        const returnQty = returnStockTotals.get(itemId);
        const issuedQty = sourceStockTotals.get(itemId);
        if (!returnQty || !issuedQty || returnQty.greaterThan(issuedQty)) {
          throw new Error("Return quantity cannot exceed quantity issued in the source slip.");
        }
      }
    }

    const slip = await tx.slip.create({
      data: {
        slipNo: generateSlipNo(parsed.slipType),
        slipType: parsed.slipType,
        propertyId: parsed.propertyId,
        fromLocationId: parsed.fromLocationId,
        toLocationId: parsed.toLocationId,
        department: parsed.department,
        requestedById: parsed.requestedById,
        issuedById: parsed.issuedById,
        receivedById: parsed.receivedById,
        vendorId: parsed.vendorId,
      },
    });

    for (const line of parsed.lines) {
      const item = await tx.item.findUnique({
        where: { id: line.itemId },
        select: { id: true, itemType: true },
      });

      if (!item) {
        throw new Error("Selected item does not exist.");
      }

      if (item.itemType !== line.itemType) {
        throw new Error("Submitted line type does not match item type.");
      }

      if (line.itemType === ItemType.STOCK) {
        const qty = new Prisma.Decimal(line.qty ?? 0);
        
        if (parsed.slipType === SlipType.RECEIVE) {
          // For RECEIVE slips, only add stock to destination (no source location)
          await adjustStockOrThrow(tx, item.id, parsed.toLocationId, qty);
        } else {
          // For other slip types, move stock from source to destination
          await adjustStockOrThrow(tx, item.id, parsed.fromLocationId!, qty.neg());
          await adjustStockOrThrow(tx, item.id, parsed.toLocationId, qty);
        }

        await tx.slipLine.create({
          data: {
            slipId: slip.id,
            itemId: item.id,
            qty,
            conditionAtMove: line.conditionAtMove,
            notes: line.notes,
          },
        });

        await tx.movementLog.create({
          data: {
            movementType: movementTypeForSlip(parsed.slipType),
            itemId: item.id,
            qty,
            slipId: slip.id,
            fromLocationId: parsed.fromLocationId,
            toLocationId: parsed.toLocationId,
            condition: line.conditionAtMove,
            note: line.notes,
          },
        });
      } else {
        const asset = await tx.asset.findUnique({
          where: { id: line.assetId },
          select: { id: true, itemId: true, condition: true },
        });

        if (!asset || asset.itemId !== item.id) {
          throw new Error("Selected asset does not match the line item.");
        }

        if (
          parsed.slipType === SlipType.ISSUE &&
          (asset.condition === Condition.SCRAP ||
            asset.condition === Condition.UNDER_MAINTENANCE)
        ) {
          throw new Error("Asset cannot be issued in SCRAP or UNDER_MAINTENANCE condition.");
        }

        const nextCondition =
          parsed.slipType === SlipType.RETURN && line.conditionAtMove
            ? line.conditionAtMove
            : asset.condition;

        await tx.asset.update({
          where: { id: asset.id },
          data: {
            currentLocationId: parsed.toLocationId,
            condition: nextCondition,
          },
        });

        await tx.slipLine.create({
          data: {
            slipId: slip.id,
            itemId: item.id,
            assetId: asset.id,
            conditionAtMove: line.conditionAtMove,
            notes: line.notes,
          },
        });

        await tx.movementLog.create({
          data: {
            movementType: movementTypeForSlip(parsed.slipType),
            itemId: item.id,
            assetId: asset.id,
            slipId: slip.id,
            fromLocationId: parsed.fromLocationId,
            toLocationId: parsed.toLocationId,
            condition: line.conditionAtMove ?? asset.condition,
            note: line.notes,
          },
        });
      }
    }

    if (parsed.signature) {
      await tx.signature.create({
        data: {
          slipId: slip.id,
          signedByName: parsed.signature.signedByName,
          signedByUserId: parsed.signature.signedByUserId,
          method: parsed.signature.method,
        },
      });
    }

    await writeAuditEvent(tx, {
      entityType: EntityType.SLIP,
      entityId: slip.id,
      action: AuditAction.CREATE,
      newValue: {
        slipNo: slip.slipNo,
        slipType: slip.slipType,
        sourceSlipId: parsed.sourceSlipId,
        lineCount: parsed.lines.length,
        hasSignature: Boolean(parsed.signature),
      },
      createdById: session.id,
    });

    return slip;
  });
}

export async function addSignatureToSlip(input: unknown) {
  const session = await requireSessionOrThrow();
  assertPermission(canCreateSlip(session.role), "You do not have permission to sign slips.");

  const parsed = addSignatureInputSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const signature = await tx.signature.create({
      data: {
        slipId: parsed.slipId,
        signedByName: parsed.signedByName,
        signedByUserId: parsed.signedByUserId,
        method: parsed.method,
      },
    });

    await writeAuditEvent(tx, {
      entityType: EntityType.SLIP,
      entityId: parsed.slipId,
      action: AuditAction.UPDATE,
      newValue: {
        signatureId: signature.id,
        method: signature.method,
        signedByName: signature.signedByName,
      },
      createdById: session.id,
    });

    return signature;
  });
}

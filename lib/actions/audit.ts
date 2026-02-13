"use server";

import { AuditAction, EntityType, Prisma } from "@prisma/client";

type TxClient = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type WriteAuditInput = {
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  createdById?: string;
};

export async function writeAuditEvent(tx: TxClient, input: WriteAuditInput): Promise<void> {
  await tx.auditEvent.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      oldValue: input.oldValue,
      newValue: input.newValue,
      createdById: input.createdById,
    },
  });
}

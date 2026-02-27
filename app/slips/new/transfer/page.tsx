import { SignatureMethod, SlipType } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ArrowLeftRight, ChevronRight } from "lucide-react";

import { SlipForm } from "@/app/slips/new/components/slip-form";
import { createSlip } from "@/lib/actions/slips";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type TransferPageProps = {
  searchParams?: Promise<{ ok?: string; error?: string }>;
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to create transfer slip.";
}

export default async function NewTransferSlipPage({ searchParams }: TransferPageProps) {
  const params = searchParams ? await searchParams : undefined;

  const [properties, locations, users, items, assets] = await Promise.all([
    prisma.property.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.asset.findMany({
      orderBy: { assetTag: "asc" },
      include: { item: { select: { name: true } } },
    }),
  ]);

  async function submitTransfer(formData: FormData) {
    "use server";

    try {
      const linesPayload = formData.get("linesPayload");
      const lines = z.array(z.record(z.string(), z.unknown())).parse(
        JSON.parse(typeof linesPayload === "string" ? linesPayload : "[]"),
      );

      const slip = await createSlip({
        slipType: SlipType.TRANSFER,
        propertyId: String(formData.get("propertyId")),
        fromLocationId: String(formData.get("fromLocationId")),
        toLocationId: String(formData.get("toLocationId")),
        department: String(formData.get("department")),
        requestedById: String(formData.get("requestedById") || "") || undefined,
        issuedById: String(formData.get("issuedById") || "") || undefined,
        lines,
        signature: {
          signedByName: String(formData.get("signedByName")),
          signedByUserId: String(formData.get("signedByUserId") || "") || undefined,
          method: SignatureMethod.TYPED,
        },
      });

      redirect(`/slips/${slip.id}`);
    } catch (error) {
      redirect(`/slips/new/transfer?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Transfer Items"
        description="Move items between locations within the same property or across properties."
        icon={<ArrowLeftRight className="h-5 w-5" />}
        actions={
          <Button variant="outline" asChild>
            <Link href="/slips">
              <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
              Back
            </Link>
          </Button>
        }
      />

      {params?.ok && (
        <Alert variant="success">
          <AlertDescription>Slip created: {params.ok}</AlertDescription>
        </Alert>
      )}

      {params?.error && (
        <Alert variant="destructive">
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      )}

      <SlipForm
        slipType={SlipType.TRANSFER}
        properties={properties}
        locations={locations}
        users={users}
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          itemType: item.itemType,
        }))}
        assets={assets.map((asset) => ({
          id: asset.id,
          assetTag: asset.assetTag,
          itemId: asset.itemId,
          itemName: asset.item.name,
        }))}
        issueSlips={[]}
        submitAction={submitTransfer}
      />
    </div>
  );
}

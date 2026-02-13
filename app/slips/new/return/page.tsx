import { SignatureMethod, SlipType } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

import { SlipForm } from "@/app/slips/new/components/slip-form";
import { createSlip } from "@/lib/actions/slips";
import { prisma } from "@/lib/prisma";

type ReturnPageProps = {
  searchParams?: Promise<{ ok?: string; error?: string }>;
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to create return slip.";
}

export default async function NewReturnSlipPage({ searchParams }: ReturnPageProps) {
  const params = searchParams ? await searchParams : undefined;

  const [properties, locations, users, items, assets, issueSlips] = await Promise.all([
    prisma.property.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.asset.findMany({
      orderBy: { assetTag: "asc" },
      include: { item: { select: { name: true } } },
    }),
    prisma.slip.findMany({
      where: { slipType: SlipType.ISSUE },
      select: { id: true, slipNo: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  async function submitReturn(formData: FormData) {
    "use server";

    try {
      const linesPayload = formData.get("linesPayload");
      const lines = z.array(z.record(z.string(), z.unknown())).parse(
        JSON.parse(typeof linesPayload === "string" ? linesPayload : "[]"),
      );

      const slip = await createSlip({
        slipType: SlipType.RETURN,
        propertyId: String(formData.get("propertyId")),
        fromLocationId: String(formData.get("fromLocationId")),
        toLocationId: String(formData.get("toLocationId")),
        sourceSlipId: String(formData.get("sourceSlipId") || "") || undefined,
        department: String(formData.get("department")),
        requestedById: String(formData.get("requestedById") || "") || undefined,
        issuedById: String(formData.get("issuedById") || "") || undefined,
        receivedById: String(formData.get("receivedById") || "") || undefined,
        lines,
        signature: {
          signedByName: String(formData.get("signedByName")),
          signedByUserId: String(formData.get("signedByUserId") || "") || undefined,
          method: SignatureMethod.TYPED,
        },
      });

      redirect(`/slips/${slip.id}`);
    } catch (error) {
      redirect(`/slips/new/return?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Return Items</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Record items coming back and capture condition for equipment when needed.
        </p>
      </header>

      {params?.ok ? (
        <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-900">
          Slip created: {params.ok}
        </p>
      ) : null}

      {params?.error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-900">
          {params.error}
        </p>
      ) : null}

      <SlipForm
        slipType={SlipType.RETURN}
        properties={properties}
        locations={locations}
        users={users}
        items={items}
        assets={assets.map((asset) => ({
          id: asset.id,
          assetTag: asset.assetTag,
          itemId: asset.itemId,
          itemName: asset.item.name,
        }))}
        issueSlips={issueSlips}
        submitAction={submitReturn}
      />
    </main>
  );
}

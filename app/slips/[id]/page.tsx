import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { PrintButton } from "./print-button";

type SlipDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function displayQty(qty: unknown): string {
  if (qty === null || qty === undefined) {
    return "-";
  }
  return String(qty);
}

export default async function SlipDetailPage({ params }: SlipDetailPageProps) {
  const { id } = await params;

  const slip = await prisma.slip.findUnique({
    where: { id },
    include: {
      property: true,
      fromLocation: true,
      toLocation: true,
      requestedBy: true,
      issuedBy: true,
      receivedBy: true,
      lines: {
        include: {
          item: true,
          asset: true,
        },
        orderBy: { createdAt: "asc" },
      },
      signatures: {
        include: { signedByUser: true },
        orderBy: { signedAt: "asc" },
      },
    },
  });

  if (!slip) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Slip {slip.slipNo}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {slip.slipType} · {formatDate(slip.createdAt)}
          </p>
        </div>
        <PrintButton />
      </div>

      <section className="rounded-lg border p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="font-medium">Property:</span> {slip.property.name}
          </p>
          <p>
            <span className="font-medium">Department:</span> {slip.department}
          </p>
          <p>
            <span className="font-medium">From:</span> {slip.fromLocation?.name ?? "-"}
          </p>
          <p>
            <span className="font-medium">To:</span> {slip.toLocation?.name ?? "-"}
          </p>
          <p>
            <span className="font-medium">Requested By:</span> {slip.requestedBy?.name ?? "-"}
          </p>
          <p>
            <span className="font-medium">Issued By:</span> {slip.issuedBy?.name ?? "-"}
          </p>
          <p>
            <span className="font-medium">Received By:</span> {slip.receivedBy?.name ?? "-"}
          </p>
        </div>
      </section>

      <section className="mt-4 overflow-x-auto rounded-lg border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
              <th className="border-b px-3 py-2">Item</th>
              <th className="border-b px-3 py-2">Type</th>
              <th className="border-b px-3 py-2">Asset Tag</th>
              <th className="border-b px-3 py-2">Qty</th>
              <th className="border-b px-3 py-2">Condition</th>
              <th className="border-b px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {slip.lines.map((line) => (
              <tr key={line.id}>
                <td className="border-b px-3 py-2">{line.item.name}</td>
                <td className="border-b px-3 py-2">{line.item.itemType}</td>
                <td className="border-b px-3 py-2">{line.asset?.assetTag ?? "-"}</td>
                <td className="border-b px-3 py-2">{displayQty(line.qty)}</td>
                <td className="border-b px-3 py-2">{line.conditionAtMove ?? "-"}</td>
                <td className="border-b px-3 py-2">{line.notes ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Signatures</h2>
        {slip.signatures.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">No signatures captured.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {slip.signatures.map((signature) => (
              <div key={signature.id} className="rounded-md border p-3 text-sm">
                <p>
                  <span className="font-medium">Name:</span> {signature.signedByName}
                </p>
                <p>
                  <span className="font-medium">Method:</span> {signature.method}
                </p>
                <p>
                  <span className="font-medium">Signed At:</span> {formatDate(signature.signedAt)}
                </p>
                <p>
                  <span className="font-medium">User:</span> {signature.signedByUser?.name ?? "-"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

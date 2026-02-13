import { DepartmentType, MovementType } from "@prisma/client";
import Link from "next/link";

import { ReportFiltersForm } from "@/components/reports/report-filters-form";
import { requireSessionOrThrow } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

type IssuesReportPageProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
    propertyId?: string;
    locationId?: string;
    department?: string;
    itemType?: string;
  }>;
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

export default async function IssuesReportPage({
  searchParams,
}: IssuesReportPageProps) {
  await requireSessionOrThrow();

  const params = searchParams ? await searchParams : undefined;

  const startDate = params?.startDate;
  const endDate = params?.endDate;
  const propertyId = params?.propertyId;
  const locationId = params?.locationId;
  const department = params?.department as DepartmentType | undefined;
  const itemType = params?.itemType;

  const [movements, properties, locations] = await Promise.all([
    prisma.movementLog.findMany({
      where: {
        movementType: MovementType.ISSUE_OUT,
        ...(startDate && {
          movedAt: { gte: new Date(`${startDate}T00:00:00`) },
        }),
        ...(endDate && {
          movedAt: { lte: new Date(`${endDate}T23:59:59`) },
        }),
        ...(locationId && { fromLocationId: locationId }),
        ...(itemType && {
          item: {
            itemType: itemType === "ASSET" ? "ASSET" : "STOCK"
          }
        }),
        ...(department && {
          slip: { department },
        }),
      },
      include: {
        item: { select: { name: true, itemType: true } },
        asset: { select: { assetTag: true } },
        fromLocation: { select: { name: true, propertyId: true } },
        toLocation: { select: { name: true } },
        slip: { select: { slipNo: true, department: true } },
      },
      orderBy: { movedAt: "desc" },
      take: 500,
    }),
    prisma.property.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Apply property filter on the results (since it's nested)
  const filteredMovements = propertyId
    ? movements.filter((m) => m.fromLocation?.propertyId === propertyId)
    : movements;

  // Calculate summary statistics
  const totalIssues = filteredMovements.length;
  const totalQty = filteredMovements.reduce(
    (sum, m) => sum + (m.qty ? Number(m.qty) : 1),
    0
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Issues Report</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Track all ISSUE_OUT movements with detailed filtering.
        </p>
      </header>

      <ReportFiltersForm
        properties={properties}
        locations={locations}
        startDate={startDate}
        endDate={endDate}
        propertyId={propertyId}
        locationId={locationId}
        clearHref="/reports/issues"
      >
        <label className="space-y-1 text-sm">
          <span>Department</span>
          <select
            name="department"
            defaultValue={department ?? ""}
            className="w-full rounded border px-2 py-2"
          >
            <option value="">All</option>
            {Object.values(DepartmentType).map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Item Type</span>
          <select
            name="itemType"
            defaultValue={itemType ?? ""}
            className="w-full rounded border px-2 py-2"
          >
            <option value="">All</option>
            <option value="ASSET">ASSET</option>
            <option value="STOCK">STOCK</option>
          </select>
        </label>
      </ReportFiltersForm>

      <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">Summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded border p-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Issues</p>
            <p className="text-2xl font-semibold">{totalIssues}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Quantity</p>
            <p className="text-2xl font-semibold">{totalQty.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Date Range</p>
            <p className="text-sm font-medium">
              {startDate ?? "All"} → {endDate ?? "All"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {filteredMovements.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No issues found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Date</th>
                  <th className="border-b px-3 py-2">Slip No</th>
                  <th className="border-b px-3 py-2">Item</th>
                  <th className="border-b px-3 py-2">Type</th>
                  <th className="border-b px-3 py-2">Asset Tag</th>
                  <th className="border-b px-3 py-2">Qty</th>
                  <th className="border-b px-3 py-2">From Location</th>
                  <th className="border-b px-3 py-2">To Location</th>
                  <th className="border-b px-3 py-2">Department</th>
                  <th className="border-b px-3 py-2">Condition</th>
                  <th className="border-b px-3 py-2 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr
                    key={movement.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <td className="border-b px-3 py-2 text-xs">
                      {formatDate(movement.movedAt)}
                    </td>
                    <td className="border-b px-3 py-2 font-mono text-xs">
                      {movement.slip?.slipNo ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2">{movement.item.name}</td>
                    <td className="border-b px-3 py-2">{movement.item.itemType}</td>
                    <td className="border-b px-3 py-2 font-mono text-xs">
                      {movement.asset?.assetTag ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2">{displayQty(movement.qty)}</td>
                    <td className="border-b px-3 py-2">
                      {movement.fromLocation?.name ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2">
                      {movement.toLocation?.name ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2">
                      {movement.slip?.department ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2">{movement.condition ?? "-"}</td>
                    <td className="border-b px-3 py-2 print:hidden">
                      {movement.slipId && (
                        <Link
                          href={`/slips/${movement.slipId}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View Slip
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

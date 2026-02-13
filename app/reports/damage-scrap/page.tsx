import { Condition, MovementType } from "@prisma/client";

import { ReportFiltersForm } from "@/components/reports/report-filters-form";
import { requireSessionOrThrow } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

type DamageScrapReportPageProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
    propertyId?: string;
    locationId?: string;
    reportType?: string; // "damage" | "scrap" | "all"
    approved?: string;
  }>;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getConditionBadgeColor(condition: Condition): string {
  switch (condition) {
    case Condition.NEW:
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case Condition.GOOD:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case Condition.WORN:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case Condition.DAMAGED:
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case Condition.UNDER_MAINTENANCE:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case Condition.SCRAP:
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

export default async function DamageScrapReportPage({
  searchParams,
}: DamageScrapReportPageProps) {
  await requireSessionOrThrow();

  const params = searchParams ? await searchParams : undefined;

  const startDate = params?.startDate;
  const endDate = params?.endDate;
  const propertyId = params?.propertyId;
  const locationId = params?.locationId;
  const reportType = params?.reportType ?? "all";
  const approved = params?.approved;

  // Fetch damage reports
  const damageReportsPromise =
    reportType === "scrap"
      ? Promise.resolve([])
      : prisma.damageReport.findMany({
        where: {
          ...(startDate && {
            createdAt: { gte: new Date(`${startDate}T00:00:00`) },
          }),
          ...(endDate && {
            createdAt: { lte: new Date(`${endDate}T23:59:59`) },
          }),
          ...(approved === "true" && { approvedAt: { not: null } }),
          ...(approved === "false" && { approvedAt: null }),
        },
        include: {
          item: { select: { name: true, itemType: true } },
          asset: {
            select: {
              assetTag: true,
              currentLocation: {
                select: { name: true, propertyId: true },
              },
            },
          },
          reportedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

  // Fetch scrap movements
  const scrapMovementsPromise =
    reportType === "damage"
      ? Promise.resolve([])
      : prisma.movementLog.findMany({
        where: {
          movementType: MovementType.SCRAP_OUT,
          ...(startDate && {
            movedAt: { gte: new Date(`${startDate}T00:00:00`) },
          }),
          ...(endDate && {
            movedAt: { lte: new Date(`${endDate}T23:59:59`) },
          }),
          ...(locationId && { fromLocationId: locationId }),
        },
        include: {
          item: { select: { name: true, itemType: true } },
          asset: { select: { assetTag: true } },
          fromLocation: {
            select: { name: true, propertyId: true },
          },
        },
        orderBy: { movedAt: "desc" },
        take: 500,
      });

  const [damageReports, scrapMovements, properties, locations] = await Promise.all([
    damageReportsPromise,
    scrapMovementsPromise,
    prisma.property.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Apply property/location filter on damage reports
  const filteredDamageReports = damageReports.filter((report) => {
    if (locationId && report.asset?.currentLocation) {
      // For damage reports, we need to check the asset's current location
      // but location filter doesn't directly apply to damage reports
      // We'll filter by the location ID if asset exists
      return false; // Skip for now as location filtering is complex for damage reports
    }
    if (propertyId && report.asset?.currentLocation?.propertyId) {
      return report.asset.currentLocation.propertyId === propertyId;
    }
    return true;
  });

  // Apply property filter on scrap movements
  const filteredScrapMovements = scrapMovements.filter((movement) => {
    if (propertyId && movement.fromLocation?.propertyId) {
      return movement.fromLocation.propertyId === propertyId;
    }
    if (locationId && movement.fromLocationId) {
      return movement.fromLocationId === locationId;
    }
    return true;
  });

  // Calculate summary statistics
  const totalDamageReports = filteredDamageReports.length;
  const approvedDamageReports = filteredDamageReports.filter(
    (r) => r.approvedAt !== null
  ).length;
  const totalScrapOuts = filteredScrapMovements.length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Damage & Scrap Report</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Track damage reports and scrapped assets.
        </p>
      </header>

      <ReportFiltersForm
        properties={properties}
        locations={locations}
        startDate={startDate}
        endDate={endDate}
        propertyId={propertyId}
        locationId={locationId}
        clearHref="/reports/damage-scrap"
      >
        <label className="space-y-1 text-sm">
          <span>Report Type</span>
          <select
            name="reportType"
            defaultValue={reportType}
            className="w-full rounded border px-2 py-2"
          >
            <option value="all">All</option>
            <option value="damage">Damage Reports Only</option>
            <option value="scrap">Scrap Movements Only</option>
          </select>
        </label>

        {reportType !== "scrap" && (
          <label className="space-y-1 text-sm">
            <span>Approval Status</span>
            <select
              name="approved"
              defaultValue={approved ?? ""}
              className="w-full rounded border px-2 py-2"
            >
              <option value="">All</option>
              <option value="true">Approved</option>
              <option value="false">Pending</option>
            </select>
          </label>
        )}
      </ReportFiltersForm>

      <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">Summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded border p-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Damage Reports
            </p>
            <p className="text-2xl font-semibold">{totalDamageReports}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {approvedDamageReports} approved
            </p>
          </div>
          <div className="rounded border p-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Scrap Movements
            </p>
            <p className="text-2xl font-semibold">{totalScrapOuts}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Date Range</p>
            <p className="text-sm font-medium">
              {startDate ?? "All"} → {endDate ?? "All"}
            </p>
          </div>
        </div>
      </section>

      {reportType !== "scrap" && filteredDamageReports.length > 0 && (
        <section className="rounded-lg border bg-white dark:bg-zinc-900">
          <div className="border-b p-4">
            <h2 className="text-lg font-medium">Damage Reports</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Date</th>
                  <th className="border-b px-3 py-2">Item</th>
                  <th className="border-b px-3 py-2">Asset Tag</th>
                  <th className="border-b px-3 py-2">Location</th>
                  <th className="border-b px-3 py-2">Condition</th>
                  <th className="border-b px-3 py-2">Description</th>
                  <th className="border-b px-3 py-2">Reported By</th>
                  <th className="border-b px-3 py-2">Approval</th>
                </tr>
              </thead>
              <tbody>
                {filteredDamageReports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <td className="border-b px-3 py-2 text-xs">
                      {formatDate(report.createdAt)}
                    </td>
                    <td className="border-b px-3 py-2">{report.item.name}</td>
                    <td className="border-b px-3 py-2 font-mono text-xs">
                      {report.asset?.assetTag ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2">
                      {report.asset?.currentLocation?.name ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getConditionBadgeColor(
                          report.condition
                        )}`}
                      >
                        {report.condition}
                      </span>
                    </td>
                    <td className="border-b px-3 py-2 max-w-xs truncate">
                      {report.description}
                    </td>
                    <td className="border-b px-3 py-2">
                      {report.reportedBy?.name ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2">
                      {report.approvedAt ? (
                        <span className="text-green-600 dark:text-green-400">
                          Approved
                        </span>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {reportType !== "damage" && filteredScrapMovements.length > 0 && (
        <section className="rounded-lg border bg-white dark:bg-zinc-900">
          <div className="border-b p-4">
            <h2 className="text-lg font-medium">Scrap Movements</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Date</th>
                  <th className="border-b px-3 py-2">Item</th>
                  <th className="border-b px-3 py-2">Type</th>
                  <th className="border-b px-3 py-2">Asset Tag</th>
                  <th className="border-b px-3 py-2">From Location</th>
                  <th className="border-b px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredScrapMovements.map((movement) => (
                  <tr
                    key={movement.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <td className="border-b px-3 py-2 text-xs">
                      {formatDate(movement.movedAt)}
                    </td>
                    <td className="border-b px-3 py-2">{movement.item.name}</td>
                    <td className="border-b px-3 py-2">{movement.item.itemType}</td>
                    <td className="border-b px-3 py-2 font-mono text-xs">
                      {movement.asset?.assetTag ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2">
                      {movement.fromLocation?.name ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2 max-w-xs truncate">
                      {movement.note ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {reportType !== "scrap" &&
        reportType !== "damage" &&
        filteredDamageReports.length === 0 &&
        filteredScrapMovements.length === 0 && (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            No damage reports or scrap movements found for the selected filters.
          </div>
        )}
    </main>
  );
}

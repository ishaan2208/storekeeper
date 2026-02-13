import { MaintenanceStatus } from "@prisma/client";
import Link from "next/link";

import { ReportFiltersForm } from "@/components/reports/report-filters-form";
import { requireSessionOrThrow } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

type MaintenanceReportPageProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
    propertyId?: string;
    locationId?: string;
    status?: string;
    hasVendor?: string;
  }>;
};

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function displayCost(cost: unknown): string {
  if (cost === null || cost === undefined) {
    return "-";
  }
  return `₹${Number(cost).toLocaleString("en-IN")}`;
}

function getStatusBadgeColor(status: MaintenanceStatus): string {
  switch (status) {
    case MaintenanceStatus.REPORTED:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case MaintenanceStatus.DIAGNOSING:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case MaintenanceStatus.SENT_TO_VENDOR:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case MaintenanceStatus.IN_REPAIR:
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case MaintenanceStatus.FIXED:
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case MaintenanceStatus.CLOSED:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    case MaintenanceStatus.UNREPAIRABLE:
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case MaintenanceStatus.SCRAPPED:
      return "bg-black text-white dark:bg-zinc-800 dark:text-zinc-100";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

export default async function MaintenanceReportPage({
  searchParams,
}: MaintenanceReportPageProps) {
  await requireSessionOrThrow();

  const params = searchParams ? await searchParams : undefined;

  const startDate = params?.startDate;
  const endDate = params?.endDate;
  const propertyId = params?.propertyId;
  const locationId = params?.locationId;
  const status = params?.status as MaintenanceStatus | undefined;
  const hasVendor = params?.hasVendor === "true";

  const [tickets, properties, locations] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where: {
        ...(startDate && {
          openedAt: { gte: new Date(`${startDate}T00:00:00`) },
        }),
        ...(endDate && {
          openedAt: { lte: new Date(`${endDate}T23:59:59`) },
        }),
        ...(status && { status }),
        ...(hasVendor && { vendorName: { not: null } }),
        ...(locationId && {
          asset: { currentLocationId: locationId },
        }),
      },
      include: {
        asset: {
          select: {
            assetTag: true,
            item: { select: { name: true } },
            currentLocation: {
              select: { name: true, propertyId: true },
            },
          },
        },
        createdBy: { select: { name: true } },
        logs: { select: { id: true } },
      },
      orderBy: { openedAt: "desc" },
      take: 500,
    }),
    prisma.property.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Apply property filter on the results (since it's nested)
  const filteredTickets = propertyId
    ? tickets.filter((t) => t.asset.currentLocation?.propertyId === propertyId)
    : tickets;

  // Calculate summary statistics
  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter(
    (t) => t.status !== MaintenanceStatus.CLOSED && t.status !== MaintenanceStatus.SCRAPPED
  ).length;
  const totalEstimatedCost = filteredTickets.reduce(
    (sum, t) => sum + Number(t.estimatedCost ?? 0),
    0
  );
  const totalActualCost = filteredTickets.reduce(
    (sum, t) => sum + Number(t.actualCost ?? 0),
    0
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Maintenance Report</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Comprehensive maintenance ticket analysis with cost tracking.
        </p>
      </header>

      <ReportFiltersForm
        properties={properties}
        locations={locations}
        startDate={startDate}
        endDate={endDate}
        propertyId={propertyId}
        locationId={locationId}
        clearHref="/reports/maintenance"
      >
        <label className="space-y-1 text-sm">
          <span>Status</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="w-full rounded border px-2 py-2"
          >
            <option value="">All</option>
            {Object.values(MaintenanceStatus).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="hasVendor"
            value="true"
            defaultChecked={hasVendor}
            className="h-4 w-4"
          />
          <span>Has Vendor</span>
        </label>
      </ReportFiltersForm>

      <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">Summary</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded border p-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Tickets</p>
            <p className="text-2xl font-semibold">{totalTickets}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Open Tickets</p>
            <p className="text-2xl font-semibold">{openTickets}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Est. Cost</p>
            <p className="text-xl font-semibold">
              {displayCost(totalEstimatedCost)}
            </p>
          </div>
          <div className="rounded border p-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Actual Cost</p>
            <p className="text-xl font-semibold">
              {displayCost(totalActualCost)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {filteredTickets.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No maintenance tickets found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Asset Tag</th>
                  <th className="border-b px-3 py-2">Item</th>
                  <th className="border-b px-3 py-2">Status</th>
                  <th className="border-b px-3 py-2">Problem</th>
                  <th className="border-b px-3 py-2">Vendor</th>
                  <th className="border-b px-3 py-2">Location</th>
                  <th className="border-b px-3 py-2">Est. Cost</th>
                  <th className="border-b px-3 py-2">Actual Cost</th>
                  <th className="border-b px-3 py-2">Opened</th>
                  <th className="border-b px-3 py-2">Closed</th>
                  <th className="border-b px-3 py-2">Logs</th>
                  <th className="border-b px-3 py-2 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <td className="border-b px-3 py-2 font-mono text-xs">
                      {ticket.asset.assetTag}
                    </td>
                    <td className="border-b px-3 py-2">{ticket.asset.item.name}</td>
                    <td className="border-b px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(
                          ticket.status
                        )}`}
                      >
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="border-b px-3 py-2 max-w-xs truncate">
                      {ticket.problemText}
                    </td>
                    <td className="border-b px-3 py-2">{ticket.vendorName ?? "-"}</td>
                    <td className="border-b px-3 py-2">
                      {ticket.asset.currentLocation?.name ?? "-"}
                    </td>
                    <td className="border-b px-3 py-2">
                      {displayCost(ticket.estimatedCost)}
                    </td>
                    <td className="border-b px-3 py-2">
                      {displayCost(ticket.actualCost)}
                    </td>
                    <td className="border-b px-3 py-2 text-xs">
                      {formatDate(ticket.openedAt)}
                    </td>
                    <td className="border-b px-3 py-2 text-xs">
                      {formatDate(ticket.closedAt)}
                    </td>
                    <td className="border-b px-3 py-2 text-center">
                      {ticket.logs.length}
                    </td>
                    <td className="border-b px-3 py-2 print:hidden">
                      <Link
                        href={`/maintenance/${ticket.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        View
                      </Link>
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

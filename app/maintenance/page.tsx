import { MaintenanceStatus } from "@prisma/client";
import Link from "next/link";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { canCloseMaintenance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type MaintenanceListPageProps = {
  searchParams?: Promise<{
    status?: string;
    assetTag?: string;
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

export default async function MaintenanceListPage({
  searchParams,
}: MaintenanceListPageProps) {
  const session = await requireSessionOrThrow();
  const hasPermission = canCloseMaintenance(session.role);

  if (!hasPermission) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <div className="rounded-lg border bg-red-50 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
          You do not have permission to view maintenance tickets.
        </div>
      </main>
    );
  }

  const params = searchParams ? await searchParams : undefined;

  const statusFilter = params?.status as MaintenanceStatus | undefined;
  const assetTagFilter = params?.assetTag?.trim();

  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      ...(statusFilter && { status: statusFilter }),
      ...(assetTagFilter && {
        asset: {
          assetTag: {
            contains: assetTagFilter,
            mode: "insensitive",
          },
        },
      }),
    },
    include: {
      asset: {
        select: {
          assetTag: true,
          item: { select: { name: true } },
          currentLocation: { select: { name: true } },
        },
      },
      createdBy: { select: { name: true } },
      logs: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Maintenance Tickets</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Track and manage asset maintenance activities.
          </p>
        </div>
        <Link
          href="/maintenance/new"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          + New Ticket
        </Link>
      </header>

      <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">Filters</h2>
        <form method="get" className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Status</span>
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="w-full rounded border px-2 py-2"
            >
              <option value="">All</option>
              {Object.values(MaintenanceStatus).map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Asset Tag</span>
            <input
              type="text"
              name="assetTag"
              defaultValue={assetTagFilter ?? ""}
              placeholder="Search by asset tag..."
              className="w-full rounded border px-2 py-2"
            />
          </label>

          <div className="flex items-end gap-2 sm:col-span-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Apply Filters
            </button>
            <Link
              href="/maintenance"
              className="rounded border px-4 py-2 text-sm font-medium"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {tickets.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No maintenance tickets found.
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
                  <th className="border-b px-3 py-2">Est. Cost</th>
                  <th className="border-b px-3 py-2">Actual Cost</th>
                  <th className="border-b px-3 py-2">Opened</th>
                  <th className="border-b px-3 py-2">Closed</th>
                  <th className="border-b px-3 py-2">Logs</th>
                  <th className="border-b px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
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
                          ticket.status,
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
                    <td className="border-b px-3 py-2">
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

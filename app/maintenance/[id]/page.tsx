import { MaintenanceStatus } from "@prisma/client";
import { notFound } from "next/navigation";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { canCloseMaintenance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

import { StatusUpdateForm } from "./status-update-form";
import { CloseTicketForm } from "./close-ticket-form";

type TicketDetailPageProps = {
  params: Promise<{ id: string }>;
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
  return `₹${Number(cost).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
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

  const { id } = await params;

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: {
      asset: {
        include: {
          item: {
            select: {
              name: true,
              category: { select: { name: true } },
            },
          },
          currentLocation: {
            select: {
              name: true,
              property: { select: { name: true } },
            },
          },
        },
      },
      createdBy: {
        select: {
          name: true,
          role: true,
        },
      },
      logs: {
        include: {
          createdBy: {
            select: {
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  const isOpen =
    ticket.status !== MaintenanceStatus.CLOSED &&
    ticket.status !== MaintenanceStatus.SCRAPPED;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">
          Maintenance Ticket #{ticket.id.slice(-6).toUpperCase()}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Created {formatDate(ticket.openedAt)} by {ticket.createdBy.name}
        </p>
      </header>

      <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">Asset Information</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="font-medium">Asset Tag:</span>{" "}
            <span className="font-mono">{ticket.asset.assetTag}</span>
          </p>
          <p>
            <span className="font-medium">Item:</span> {ticket.asset.item.name}
          </p>
          <p>
            <span className="font-medium">Category:</span>{" "}
            {ticket.asset.item.category.name}
          </p>
          <p>
            <span className="font-medium">Current Condition:</span>{" "}
            {ticket.asset.condition}
          </p>
          <p>
            <span className="font-medium">Location:</span>{" "}
            {ticket.asset.currentLocation?.name ?? "Unassigned"}
          </p>
          <p>
            <span className="font-medium">Property:</span>{" "}
            {ticket.asset.currentLocation?.property.name ?? "-"}
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">Ticket Details</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-medium">Status:</span>
            <span
              className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${ticket.status === MaintenanceStatus.CLOSED
                ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                : ticket.status === MaintenanceStatus.FIXED
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                }`}
            >
              {ticket.status.replace(/_/g, " ")}
            </span>
          </div>

          <p>
            <span className="font-medium">Problem:</span>
            <br />
            <span className="mt-1 block text-zinc-700 dark:text-zinc-300">
              {ticket.problemText}
            </span>
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <p>
              <span className="font-medium">Vendor:</span> {ticket.vendorName ?? "-"}
            </p>
            <p>
              <span className="font-medium">Estimated Cost:</span>{" "}
              {displayCost(ticket.estimatedCost)}
            </p>
            <p>
              <span className="font-medium">Actual Cost:</span>{" "}
              {displayCost(ticket.actualCost)}
            </p>
            <p>
              <span className="font-medium">Closed At:</span>{" "}
              {formatDate(ticket.closedAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">Activity Log</h2>
        {ticket.logs.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            No activity logs yet.
          </p>
        ) : (
          <div className="space-y-3">
            {ticket.logs.map((log) => (
              <div
                key={log.id}
                className="rounded border bg-zinc-50 p-3 text-sm dark:bg-zinc-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium">{log.status.replace(/_/g, " ")}</p>
                    {log.note && (
                      <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                        {log.note}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {formatDate(log.createdAt)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      by {log.createdBy.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isOpen && (
        <>
          <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
            <h2 className="mb-3 text-lg font-medium">Update Status</h2>
            <StatusUpdateForm ticketId={ticket.id} currentStatus={ticket.status} />
          </section>

          <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
            <h2 className="mb-3 text-lg font-medium">Close Ticket</h2>
            <CloseTicketForm ticketId={ticket.id} />
          </section>
        </>
      )}
    </main>
  );
}

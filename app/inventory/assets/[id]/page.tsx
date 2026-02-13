import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

type AssetDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

type TimelineEvent = {
  type: "movement" | "maintenance_ticket" | "maintenance_log" | "damage_report";
  timestamp: Date;
  data: Record<string, unknown>;
};

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const { id } = await params;

  const [asset, movementLogs, maintenanceTickets, damageReports] =
    await Promise.all([
      prisma.asset.findUnique({
        where: { id },
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
      }),
      prisma.movementLog.findMany({
        where: { assetId: id },
        include: {
          fromLocation: { select: { name: true } },
          toLocation: { select: { name: true } },
          slip: { select: { slipNo: true } },
        },
        orderBy: { movedAt: "desc" },
      }),
      prisma.maintenanceTicket.findMany({
        where: { assetId: id },
        include: {
          createdBy: { select: { name: true } },
          logs: {
            include: {
              createdBy: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { openedAt: "desc" },
      }),
      prisma.damageReport.findMany({
        where: { assetId: id },
        include: {
          reportedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  if (!asset) {
    notFound();
  }

  // Build timeline events
  const timelineEvents: TimelineEvent[] = [];

  // Add movement logs
  movementLogs.forEach((log) => {
    timelineEvents.push({
      type: "movement",
      timestamp: log.movedAt,
      data: {
        id: log.id,
        movementType: log.movementType,
        fromLocation: log.fromLocation?.name,
        toLocation: log.toLocation?.name,
        condition: log.condition,
        note: log.note,
        slipNo: log.slip?.slipNo,
        qty: log.qty,
      },
    });
  });

  // Add maintenance tickets
  maintenanceTickets.forEach((ticket) => {
    timelineEvents.push({
      type: "maintenance_ticket",
      timestamp: ticket.openedAt,
      data: {
        id: ticket.id,
        status: ticket.status,
        problemText: ticket.problemText,
        vendorName: ticket.vendorName,
        estimatedCost: ticket.estimatedCost,
        actualCost: ticket.actualCost,
        createdBy: ticket.createdBy.name,
        closedAt: ticket.closedAt,
      },
    });

    // Add maintenance logs for each ticket
    ticket.logs.forEach((log) => {
      timelineEvents.push({
        type: "maintenance_log",
        timestamp: log.createdAt,
        data: {
          id: log.id,
          ticketId: ticket.id,
          status: log.status,
          note: log.note,
          createdBy: log.createdBy.name,
        },
      });
    });
  });

  // Add damage reports
  damageReports.forEach((report) => {
    timelineEvents.push({
      type: "damage_report",
      timestamp: report.createdAt,
      data: {
        id: report.id,
        description: report.description,
        condition: report.condition,
        reportedBy: report.reportedBy?.name,
        requiresApproval: report.requiresApproval,
        approvedAt: report.approvedAt,
      },
    });
  });

  // Sort timeline by timestamp (most recent first)
  timelineEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Asset: {asset.assetTag}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {asset.item.name} · {asset.item.category.name}
          </p>
        </div>
        <Link
          href="/inventory/assets"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Back to Assets
        </Link>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Asset Details</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="font-medium">Asset Tag:</span> {asset.assetTag}
          </p>
          <p>
            <span className="font-medium">Serial Number:</span>{" "}
            {asset.serialNumber ?? "-"}
          </p>
          <p>
            <span className="font-medium">Condition:</span> {asset.condition}
          </p>
          <p>
            <span className="font-medium">Current Location:</span>{" "}
            {asset.currentLocation
              ? `${asset.currentLocation.property.name} - ${asset.currentLocation.name}`
              : "-"}
          </p>
          <p>
            <span className="font-medium">Purchase Date:</span>{" "}
            {asset.purchaseDate
              ? new Date(asset.purchaseDate).toLocaleDateString("en-IN")
              : "-"}
          </p>
          <p>
            <span className="font-medium">Warranty Until:</span>{" "}
            {asset.warrantyUntil
              ? new Date(asset.warrantyUntil).toLocaleDateString("en-IN")
              : "-"}
          </p>
          {asset.notes && (
            <p className="sm:col-span-2">
              <span className="font-medium">Notes:</span> {asset.notes}
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Timeline</h2>
        {timelineEvents.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            No activity recorded for this asset.
          </p>
        ) : (
          <div className="space-y-3">
            {timelineEvents.map((event, index) => (
              <div
                key={`${event.type}-${index}`}
                className="relative rounded-lg border p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {event.type === "movement" && (
                      <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        Movement
                      </span>
                    )}
                    {event.type === "maintenance_ticket" && (
                      <span className="inline-block rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                        Maintenance Ticket
                      </span>
                    )}
                    {event.type === "maintenance_log" && (
                      <span className="inline-block rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100">
                        Maintenance Update
                      </span>
                    )}
                    {event.type === "damage_report" && (
                      <span className="inline-block rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                        Damage Report
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {formatDate(event.timestamp)}
                  </span>
                </div>

                <div className="text-sm">
                  {event.type === "movement" && (
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Type:</span>{" "}
                        {String(event.data.movementType)}
                      </p>
                      {event.data.slipNo ? (
                        <p>
                          <span className="font-medium">Slip:</span>{" "}
                          {String(event.data.slipNo)}
                        </p>
                      ) : null}
                      {event.data.fromLocation ? (
                        <p>
                          <span className="font-medium">From:</span>{" "}
                          {String(event.data.fromLocation)}
                        </p>
                      ) : null}
                      {event.data.toLocation ? (
                        <p>
                          <span className="font-medium">To:</span>{" "}
                          {String(event.data.toLocation)}
                        </p>
                      ) : null}
                      {event.data.condition ? (
                        <p>
                          <span className="font-medium">Condition:</span>{" "}
                          {String(event.data.condition)}
                        </p>
                      ) : null}
                      {event.data.note ? (
                        <p>
                          <span className="font-medium">Note:</span>{" "}
                          {String(event.data.note)}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {event.type === "maintenance_ticket" && (
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        {String(event.data.status)}
                      </p>
                      <p>
                        <span className="font-medium">Problem:</span>{" "}
                        {String(event.data.problemText)}
                      </p>
                      {event.data.vendorName ? (
                        <p>
                          <span className="font-medium">Vendor:</span>{" "}
                          {String(event.data.vendorName)}
                        </p>
                      ) : null}
                      {event.data.estimatedCost ? (
                        <p>
                          <span className="font-medium">Estimated Cost:</span> ₹
                          {String(event.data.estimatedCost)}
                        </p>
                      ) : null}
                      {event.data.actualCost ? (
                        <p>
                          <span className="font-medium">Actual Cost:</span> ₹
                          {String(event.data.actualCost)}
                        </p>
                      ) : null}
                      <p>
                        <span className="font-medium">Created By:</span>{" "}
                        {String(event.data.createdBy)}
                      </p>
                      {event.data.closedAt ? (
                        <p>
                          <span className="font-medium">Closed At:</span>{" "}
                          {formatDate(event.data.closedAt as Date)}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {event.type === "maintenance_log" && (
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        {String(event.data.status)}
                      </p>
                      {event.data.note ? (
                        <p>
                          <span className="font-medium">Note:</span>{" "}
                          {String(event.data.note)}
                        </p>
                      ) : null}
                      <p>
                        <span className="font-medium">Updated By:</span>{" "}
                        {String(event.data.createdBy)}
                      </p>
                    </div>
                  )}

                  {event.type === "damage_report" && (
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">Condition:</span>{" "}
                        {String(event.data.condition)}
                      </p>
                      <p>
                        <span className="font-medium">Description:</span>{" "}
                        {String(event.data.description)}
                      </p>
                      {event.data.reportedBy ? (
                        <p>
                          <span className="font-medium">Reported By:</span>{" "}
                          {String(event.data.reportedBy)}
                        </p>
                      ) : null}
                      {event.data.requiresApproval ? (
                        <p>
                          <span className="font-medium">Approval Status:</span>{" "}
                          {event.data.approvedAt
                            ? `Approved on ${formatDate(event.data.approvedAt as Date)}`
                            : "Pending Approval"}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Summary</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="font-medium">Total Movements</p>
            <p className="text-2xl font-semibold">{movementLogs.length}</p>
          </div>
          <div>
            <p className="font-medium">Maintenance Tickets</p>
            <p className="text-2xl font-semibold">
              {maintenanceTickets.length}
            </p>
          </div>
          <div>
            <p className="font-medium">Damage Reports</p>
            <p className="text-2xl font-semibold">{damageReports.length}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

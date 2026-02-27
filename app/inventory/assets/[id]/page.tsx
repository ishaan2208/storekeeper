import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Tag,
  ChevronRight,
  Package,
  MapPin,
  Calendar,
  FileText,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Clock,
  User,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
    <div className="space-y-6">
      <PageHeader
        title={`Asset: ${asset.assetTag}`}
        description={`${asset.item.name} · ${asset.item.category.name}`}
        icon={<Tag className="h-5 w-5" />}
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/assets">
              <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
              Back to Assets
            </Link>
          </Button>
        }
      />

      {/* Asset Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Asset Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Asset Tag</p>
              <p className="font-medium font-mono">{asset.assetTag}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Serial Number</p>
              <p className="font-medium">{asset.serialNumber ?? "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Condition</p>
              <StatusBadge status={asset.condition} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Current Location
              </p>
              <p className="font-medium">
                {asset.currentLocation
                  ? `${asset.currentLocation.property.name} - ${asset.currentLocation.name}`
                  : "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Purchase Date
              </p>
              <p className="font-medium">
                {asset.purchaseDate
                  ? new Date(asset.purchaseDate).toLocaleDateString("en-IN")
                  : "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Warranty Until
              </p>
              <p className="font-medium">
                {asset.warrantyUntil
                  ? new Date(asset.warrantyUntil).toLocaleDateString("en-IN")
                  : "-"}
              </p>
            </div>
            {asset.notes && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{asset.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Movements</p>
                <p className="text-3xl font-bold">{movementLogs.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maintenance Tickets</p>
                <p className="text-3xl font-bold">{maintenanceTickets.length}</p>
              </div>
              <Wrench className="h-8 w-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Damage Reports</p>
                <p className="text-3xl font-bold">{damageReports.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timelineEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity recorded for this asset.
            </p>
          ) : (
            <div className="space-y-4">
              {timelineEvents.map((event, index) => (
                <div key={`${event.type}-${index}`}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {event.type === "movement" && (
                          <>
                            <Package className="h-4 w-4 text-primary" />
                            <Badge variant="secondary">Movement</Badge>
                          </>
                        )}
                        {event.type === "maintenance_ticket" && (
                          <>
                            <Wrench className="h-4 w-4 text-warning" />
                            <Badge variant="warning">Maintenance Ticket</Badge>
                          </>
                        )}
                        {event.type === "maintenance_log" && (
                          <>
                            <FileText className="h-4 w-4 text-primary" />
                            <Badge variant="outline">Maintenance Update</Badge>
                          </>
                        )}
                        {event.type === "damage_report" && (
                          <>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <Badge variant="destructive">Damage Report</Badge>
                          </>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>

                    <div className="ml-6 space-y-2 text-sm">
                      {event.type === "movement" && (
                        <>
                          <p>
                            <span className="font-medium">Type:</span>{" "}
                            <StatusBadge status={String(event.data.movementType)} variant="secondary" />
                          </p>
                          {event.data.slipNo && (
                            <p>
                              <span className="font-medium">Slip:</span>{" "}
                              <code className="rounded bg-muted px-1.5 py-0.5">
                                {String(event.data.slipNo)}
                              </code>
                            </p>
                          )}
                          {event.data.fromLocation && (
                            <p className="flex items-center gap-2">
                              <span className="font-medium">From:</span>{" "}
                              {String(event.data.fromLocation)}
                            </p>
                          )}
                          {event.data.toLocation && (
                            <p className="flex items-center gap-2">
                              <span className="font-medium">To:</span>{" "}
                              {String(event.data.toLocation)}
                            </p>
                          )}
                          {event.data.condition && (
                            <p>
                              <span className="font-medium">Condition:</span>{" "}
                              <StatusBadge status={String(event.data.condition)} />
                            </p>
                          )}
                          {event.data.note && (
                            <p className="text-muted-foreground italic">
                              "{String(event.data.note)}"
                            </p>
                          )}
                        </>
                      )}

                      {event.type === "maintenance_ticket" && (
                        <>
                          <p>
                            <span className="font-medium">Status:</span>{" "}
                            <StatusBadge status={String(event.data.status)} />
                          </p>
                          <p>
                            <span className="font-medium">Problem:</span>{" "}
                            {String(event.data.problemText)}
                          </p>
                          {event.data.vendorName && (
                            <p>
                              <span className="font-medium">Vendor:</span>{" "}
                              {String(event.data.vendorName)}
                            </p>
                          )}
                          {event.data.estimatedCost && (
                            <p>
                              <span className="font-medium">Estimated Cost:</span> ₹
                              {String(event.data.estimatedCost)}
                            </p>
                          )}
                          {event.data.actualCost && (
                            <p>
                              <span className="font-medium">Actual Cost:</span> ₹
                              {String(event.data.actualCost)}
                            </p>
                          )}
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {String(event.data.createdBy)}
                          </p>
                          {event.data.closedAt && (
                            <p>
                              <span className="font-medium">Closed:</span>{" "}
                              {formatDate(event.data.closedAt as Date)}
                            </p>
                          )}
                        </>
                      )}

                      {event.type === "maintenance_log" && (
                        <>
                          <p>
                            <span className="font-medium">Status:</span>{" "}
                            <StatusBadge status={String(event.data.status)} />
                          </p>
                          {event.data.note && (
                            <p className="text-muted-foreground italic">
                              "{String(event.data.note)}"
                            </p>
                          )}
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {String(event.data.createdBy)}
                          </p>
                        </>
                      )}

                      {event.type === "damage_report" && (
                        <>
                          <p>
                            <span className="font-medium">Condition:</span>{" "}
                            <StatusBadge status={String(event.data.condition)} />
                          </p>
                          <p>
                            <span className="font-medium">Description:</span>{" "}
                            {String(event.data.description)}
                          </p>
                          {event.data.reportedBy && (
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <User className="h-3 w-3" />
                              {String(event.data.reportedBy)}
                            </p>
                          )}
                          {event.data.requiresApproval && (
                            <p>
                              <span className="font-medium">Approval:</span>{" "}
                              {event.data.approvedAt
                                ? `Approved on ${formatDate(event.data.approvedAt as Date)}`
                                : "Pending Approval"}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

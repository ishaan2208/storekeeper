import { MaintenanceStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  ChevronRight,
  Tag,
  Package,
  MapPin,
  AlertCircle,
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { canCloseMaintenance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InlineError } from "@/components/ui/inline-error";

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
      <div className="space-y-6">
        <PageHeader
          title="Maintenance Ticket"
          icon={<Wrench className="h-5 w-5" />}
        />
        <InlineError
          title="Permission Denied"
          message="You do not have permission to view maintenance tickets."
        />
      </div>
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
    <div className="space-y-6">
      <PageHeader
        title={`Maintenance Ticket #${ticket.id.slice(-6).toUpperCase()}`}
        description={`Created ${formatDate(ticket.openedAt)} by ${ticket.createdBy.name}`}
        icon={<Wrench className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={ticket.status.replace(/_/g, " ")} />
            <Button variant="outline" asChild>
              <Link href="/maintenance">
                <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      {/* Asset Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Asset Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Asset Tag</p>
              <p className="font-medium font-mono">{ticket.asset.assetTag}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Item</p>
              <p className="font-medium">{ticket.asset.item.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{ticket.asset.item.category.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current Condition</p>
              <StatusBadge status={ticket.asset.condition} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Location
              </p>
              <p className="font-medium">
                {ticket.asset.currentLocation?.name ?? "Unassigned"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Property</p>
              <p className="font-medium">
                {ticket.asset.currentLocation?.property.name ?? "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Ticket Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Problem Description</p>
            <p className="text-sm">{ticket.problemText}</p>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Vendor</p>
              <p className="font-medium">{ticket.vendorName ?? "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Estimated Cost
              </p>
              <p className="font-medium">{displayCost(ticket.estimatedCost)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Actual Cost
              </p>
              <p className="font-medium">{displayCost(ticket.actualCost)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Closed At
              </p>
              <p className="font-medium">{formatDate(ticket.closedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Log ({ticket.logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticket.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logs yet.</p>
          ) : (
            <div className="space-y-4">
              {ticket.logs.map((log, index) => (
                <div key={log.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={log.status.replace(/_/g, " ")} />
                      </div>
                      {log.note && (
                        <p className="text-sm text-muted-foreground">{log.note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </p>
                      <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {log.createdBy.name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Forms */}
      {isOpen && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Update Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusUpdateForm ticketId={ticket.id} currentStatus={ticket.status} />
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Close Ticket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CloseTicketForm ticketId={ticket.id} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

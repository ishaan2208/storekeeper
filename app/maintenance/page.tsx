import { MaintenanceStatus } from "@prisma/client";
import Link from "next/link";
import { Wrench, Plus, Filter, Search, Eye, DollarSign, Hash } from "lucide-react";

import { requireSessionOrThrow } from "@/lib/auth-server";
import { canCloseMaintenance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineError } from "@/components/ui/inline-error";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default async function MaintenanceListPage({
  searchParams,
}: MaintenanceListPageProps) {
  const session = await requireSessionOrThrow();
  const hasPermission = canCloseMaintenance(session.role);

  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Maintenance Tickets"
          description="Track and manage asset maintenance activities."
          icon={<Wrench className="h-5 w-5" />}
        />
        <InlineError
          title="Permission Denied"
          message="You do not have permission to view maintenance tickets."
        />
      </div>
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

  const openTicketsCount = tickets.filter((t) => !t.closedAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Tickets"
        description="Track and manage asset maintenance activities."
        icon={<Wrench className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            {openTicketsCount > 0 && (
              <Badge variant="warning">
                {openTicketsCount} Open
              </Badge>
            )}
            <Button asChild>
              <Link href="/maintenance/new">
                <Plus className="mr-2 h-4 w-4" />
                New Ticket
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        <form method="get" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={statusFilter ?? ""}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MaintenanceStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetTag">
                <Search className="mr-1 inline-block h-4 w-4" />
                Asset Tag
              </Label>
              <Input
                id="assetTag"
                name="assetTag"
                defaultValue={assetTagFilter ?? ""}
                placeholder="Search by asset tag..."
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" asChild>
              <Link href="/maintenance">Clear</Link>
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        {tickets.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-8 w-8" />}
            title="No maintenance tickets found"
            description={
              (statusFilter || assetTagFilter)
                ? "No tickets match your filters."
                : "No maintenance tickets have been created yet."
            }
            action={
              (statusFilter || assetTagFilter) ? (
                <Button variant="outline" asChild>
                  <Link href="/maintenance">Clear Filters</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/maintenance/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Ticket
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                  <TableHead className="text-right">Actual Cost</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead className="text-right">Logs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium font-mono text-sm">
                      {ticket.asset.assetTag}
                    </TableCell>
                    <TableCell className="font-medium">
                      {ticket.asset.item.name}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status.replace(/_/g, " ")} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {ticket.problemText}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.vendorName ?? "-"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {displayCost(ticket.estimatedCost)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {displayCost(ticket.actualCost)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(ticket.openedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(ticket.closedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        <Hash className="mr-1 h-3 w-3" />
                        {ticket.logs.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/maintenance/${ticket.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

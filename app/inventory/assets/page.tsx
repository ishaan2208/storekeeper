import Link from "next/link";
import { Tags, Filter, Search, Eye, Wrench } from "lucide-react";
import { Condition, ItemType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

type AssetsInventoryPageProps = {
  searchParams?: Promise<{
    search?: string;
    condition?: string;
    locationId?: string;
  }>;
};

export default async function AssetsInventoryPage({
  searchParams,
}: AssetsInventoryPageProps) {
  const params = searchParams ? await searchParams : undefined;

  const searchQuery = params?.search ?? "";
  const conditionFilter = params?.condition as Condition | undefined;
  const locationIdFilter = params?.locationId;

  const [assets, locations] = await Promise.all([
    prisma.asset.findMany({
      where: {
        ...(conditionFilter && { condition: conditionFilter }),
        ...(locationIdFilter && { currentLocationId: locationIdFilter }),
        item: {
          itemType: ItemType.ASSET,
          isActive: true,
          ...(searchQuery && {
            name: {
              contains: searchQuery,
              mode: "insensitive" as const,
            },
          }),
        },
      },
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
        maintenanceTickets: {
          select: { status: true },
          where: { closedAt: null },
          take: 1,
        },
      },
      orderBy: { assetTag: "asc" },
    }),
    prisma.location.findMany({
      include: { property: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const maintenanceCount = assets.filter(
    (asset) => asset.maintenanceTickets.length > 0
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Inventory"
        description="View individually tracked assets with their current status."
        icon={<Tags className="h-5 w-5" />}
        actions={
          maintenanceCount > 0 && (
            <Badge variant="warning" className="gap-1">
              <Wrench className="h-3 w-3" />
              {maintenanceCount} In Maintenance
            </Badge>
          )
        }
      />

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        <form method="get" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">
                <Search className="mr-1 inline-block h-4 w-4" />
                Search Item
              </Label>
              <Input
                id="search"
                name="search"
                defaultValue={searchQuery}
                placeholder="Search by item name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select name="condition" defaultValue={conditionFilter ?? ""}>
                <SelectTrigger id="condition">
                  <SelectValue placeholder="All Conditions" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Condition).map((cond) => (
                    <SelectItem key={cond} value={cond}>
                      {cond}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationId">Location</Label>
              <Select name="locationId" defaultValue={locationIdFilter ?? ""}>
                <SelectTrigger id="locationId">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.property.name} - {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" asChild>
              <Link href="/inventory/assets">Clear</Link>
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        {assets.length === 0 ? (
          <EmptyState
            icon={<Tags className="h-8 w-8" />}
            title="No assets found"
            description={
              (searchQuery || conditionFilter || locationIdFilter)
                ? "No assets match your filters."
                : "No assets are registered in the system."
            }
            action={
              (searchQuery || conditionFilter || locationIdFilter) && (
                <Button variant="outline" asChild>
                  <Link href="/inventory/assets">Clear Filters</Link>
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
                  <TableHead>Category</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const hasOpenMaintenance =
                    asset.maintenanceTickets.length > 0;

                  return (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium font-mono text-sm">
                        {asset.assetTag}
                      </TableCell>
                      <TableCell className="font-medium">
                        {asset.item.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {asset.item.category.name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={asset.condition} />
                      </TableCell>
                      <TableCell>
                        {asset.currentLocation ? (
                          <Badge variant="outline">
                            {asset.currentLocation.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {asset.currentLocation?.property.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        {hasOpenMaintenance ? (
                          <Badge variant="warning" className="gap-1">
                            <Wrench className="h-3 w-3" />
                            {asset.maintenanceTickets[0].status}
                          </Badge>
                        ) : (
                          <StatusBadge status="ACTIVE" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/inventory/assets/${asset.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

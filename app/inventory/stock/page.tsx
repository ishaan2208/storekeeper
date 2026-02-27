import Link from "next/link";
import { Boxes, Filter, AlertCircle, CheckCircle2, Search } from "lucide-react";
import { ItemType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { Checkbox } from "@/components/ui/checkbox";

type StockPageProps = {
  searchParams?: Promise<{
    search?: string;
    locationId?: string;
    lowStock?: string;
  }>;
};

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = searchParams ? await searchParams : undefined;

  const searchQuery = params?.search ?? "";
  const locationIdFilter = params?.locationId;
  const lowStockFilter = params?.lowStock === "true";

  const [stockBalances, locations] = await Promise.all([
    prisma.stockBalance.findMany({
      where: {
        ...(locationIdFilter && { locationId: locationIdFilter }),
        item: {
          itemType: ItemType.STOCK,
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
            unit: true,
            reorderLevel: true,
            category: { select: { name: true } },
          },
        },
        location: {
          select: {
            name: true,
            property: { select: { name: true } },
          },
        },
      },
      orderBy: [{ item: { name: "asc" } }, { location: { name: "asc" } }],
    }),
    prisma.location.findMany({
      include: { property: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  // Filter for low stock
  const filteredBalances = lowStockFilter
    ? stockBalances.filter(
        (balance) =>
          balance.item.reorderLevel &&
          Number(balance.qtyOnHand) < Number(balance.item.reorderLevel)
      )
    : stockBalances;

  const lowStockCount = stockBalances.filter(
    (balance) =>
      balance.item.reorderLevel &&
      Number(balance.qtyOnHand) < Number(balance.item.reorderLevel)
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Inventory"
        description="View quantity-tracked items across all locations."
        icon={<Boxes className="h-5 w-5" />}
        actions={
          lowStockCount > 0 && (
            <Badge variant="warning" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {lowStockCount} Low Stock
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

            <div className="flex items-end space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  name="lowStock"
                  value="true"
                  defaultChecked={lowStockFilter}
                />
                <span className="font-medium">Show Low Stock Only</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" asChild>
              <Link href="/inventory/stock">Clear</Link>
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        {filteredBalances.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-8 w-8" />}
            title="No stock items found"
            description={
              lowStockFilter
                ? "No items are currently below their reorder level."
                : "No stock items match your filters."
            }
            action={
              (searchQuery || locationIdFilter || lowStockFilter) && (
                <Button variant="outline" asChild>
                  <Link href="/inventory/stock">Clear Filters</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Qty on Hand</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.map((balance) => {
                  const qtyOnHand = Number(balance.qtyOnHand);
                  const reorderLevel = balance.item.reorderLevel
                    ? Number(balance.item.reorderLevel)
                    : null;
                  const isLowStock =
                    reorderLevel !== null && qtyOnHand < reorderLevel;

                  return (
                    <TableRow key={balance.id}>
                      <TableCell className="font-medium">
                        {balance.item.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {balance.item.category.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {balance.location.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {balance.location.property.name}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {qtyOnHand.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {balance.item.unit ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {reorderLevel !== null ? reorderLevel.toFixed(2) : "-"}
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            OK
                          </Badge>
                        )}
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

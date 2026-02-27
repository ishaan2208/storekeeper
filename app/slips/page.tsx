import { DepartmentType, SlipType } from "@prisma/client";
import Link from "next/link";
import { 
  FileText, 
  Filter, 
  PackagePlus, 
  PackageMinus, 
  PackageCheck, 
  ArrowRightLeft,
  Eye,
  Hash 
} from "lucide-react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SlipsListPageProps = {
  searchParams?: Promise<{
    slipType?: string;
    department?: string;
    propertyId?: string;
  }>;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function SlipsListPage({ searchParams }: SlipsListPageProps) {
  const params = searchParams ? await searchParams : undefined;

  const slipTypeFilter = params?.slipType as SlipType | undefined;
  const departmentFilter = params?.department as DepartmentType | undefined;
  const propertyIdFilter = params?.propertyId;

  const [slips, properties] = await Promise.all([
    prisma.slip.findMany({
      where: {
        ...(slipTypeFilter && { slipType: slipTypeFilter }),
        ...(departmentFilter && { department: departmentFilter }),
        ...(propertyIdFilter && { propertyId: propertyIdFilter }),
      },
      include: {
        property: { select: { name: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        lines: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.property.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Slips"
        description="View and filter recent movement slips."
        icon={<FileText className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/slips/new/receive">
                <PackagePlus className="mr-2 h-4 w-4" />
                Receive (GRN)
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/slips/new/issue">
                <PackageMinus className="mr-2 h-4 w-4" />
                Issue
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/slips/new/return">
                <PackageCheck className="mr-2 h-4 w-4" />
                Return
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/slips/new/transfer">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfer
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="slipType">Slip Type</Label>
              <Select name="slipType" defaultValue={slipTypeFilter ?? ""}>
                <SelectTrigger id="slipType">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(SlipType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select name="department" defaultValue={departmentFilter ?? ""}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DepartmentType).map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyId">Property</Label>
              <Select name="propertyId" defaultValue={propertyIdFilter ?? ""}>
                <SelectTrigger id="propertyId">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
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
              <Link href="/slips">Clear</Link>
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        {slips.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No slips found"
            description={
              (slipTypeFilter || departmentFilter || propertyIdFilter)
                ? "No slips match your filters."
                : "No movement slips have been created yet."
            }
            action={
              (slipTypeFilter || departmentFilter || propertyIdFilter) ? (
                <Button variant="outline" asChild>
                  <Link href="/slips">Clear Filters</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/slips/new/receive">
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Create First Slip
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
                  <TableHead>Slip No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slips.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-medium font-mono text-sm">
                      {slip.slipNo}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={slip.slipType} variant="secondary" />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {slip.property.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{slip.department}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {slip.fromLocation?.name ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {slip.toLocation?.name ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        <Hash className="mr-1 h-3 w-3" />
                        {slip.lines.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(slip.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/slips/${slip.id}`}>
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

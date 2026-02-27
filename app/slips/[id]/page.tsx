import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ChevronRight,
  Building,
  MapPin,
  User,
  Truck,
  Package,
  Tag,
  Hash,
  PenLine,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import { PrintButton } from "./print-button";

type SlipDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function displayQty(qty: unknown): string {
  if (qty === null || qty === undefined) {
    return "-";
  }
  return String(qty);
}

export default async function SlipDetailPage({ params }: SlipDetailPageProps) {
  const { id } = await params;

  const slip = await prisma.slip.findUnique({
    where: { id },
    include: {
      property: true,
      fromLocation: true,
      toLocation: true,
      requestedBy: true,
      issuedBy: true,
      receivedBy: true,
      vendor: true,
      lines: {
        include: {
          item: true,
          asset: true,
        },
        orderBy: { createdAt: "asc" },
      },
      signatures: {
        include: { signedByUser: true },
        orderBy: { signedAt: "asc" },
      },
    },
  });

  if (!slip) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Slip ${slip.slipNo}`}
        description={`${slip.slipType} · ${formatDate(slip.createdAt)}`}
        icon={<FileText className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <PrintButton />
            <Button variant="outline" asChild>
              <Link href="/slips">
                <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                Back to Slips
              </Link>
            </Button>
          </div>
        }
      />

      {/* Slip Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Slip Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building className="h-4 w-4" />
                Property
              </p>
              <p className="font-medium">{slip.property.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Department</p>
              <Badge variant="outline">{slip.department}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                From Location
              </p>
              <p className="font-medium">{slip.fromLocation?.name ?? "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                To Location
              </p>
              <p className="font-medium">{slip.toLocation?.name ?? "-"}</p>
            </div>
            {slip.vendor && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Vendor
                </p>
                <p className="font-medium">{slip.vendor.name}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-4 w-4" />
                Requested By
              </p>
              <p className="font-medium">{slip.requestedBy?.name ?? "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-4 w-4" />
                Issued By
              </p>
              <p className="font-medium">{slip.issuedBy?.name ?? "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-4 w-4" />
                Received By
              </p>
              <p className="font-medium">{slip.receivedBy?.name ?? "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Line Items ({slip.lines.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slip.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.item.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={line.item.itemType} variant="secondary" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {line.asset?.assetTag ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {displayQty(line.qty)}
                    </TableCell>
                    <TableCell>
                      {line.conditionAtMove ? (
                        <StatusBadge status={line.conditionAtMove} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {line.notes ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Signatures
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slip.signatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signatures captured.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {slip.signatures.map((signature) => (
                <Card key={signature.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{signature.signedByName}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Method:</span>
                        <Badge variant="outline">{signature.method}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Signed At:</span>
                        <span className="text-xs">{formatDate(signature.signedAt)}</span>
                      </div>
                      {signature.signedByUser && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">User:</span>
                          <span>{signature.signedByUser.name}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

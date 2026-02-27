import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Tag, Plus, Edit, Trash2, X, ChevronRight, Calendar } from "lucide-react";
import { Condition, ItemType } from "@prisma/client";

import { createAsset, updateAsset, deleteAsset } from "@/lib/actions/masters/assets";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineError } from "@/components/ui/inline-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AssetsPageProps = {
  searchParams?: Promise<{ edit?: string; error?: string; success?: string }>;
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Operation failed.";
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const editingId = params?.edit;

  const [assets, items, locations, editingAsset] = await Promise.all([
    prisma.asset.findMany({
      include: {
        item: { select: { name: true } },
        currentLocation: { select: { name: true, property: { select: { name: true } } } },
      },
      orderBy: { assetTag: "asc" },
    }),
    prisma.item.findMany({
      where: { itemType: ItemType.ASSET, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      include: { property: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    editingId ? prisma.asset.findUnique({ where: { id: editingId } }) : null,
  ]);

  async function handleCreate(formData: FormData) {
    "use server";

    try {
      await createAsset({
        itemId: String(formData.get("itemId")),
        assetTag: String(formData.get("assetTag")),
        serialNumber: String(formData.get("serialNumber") || "") || undefined,
        purchaseDate: String(formData.get("purchaseDate") || "") || undefined,
        warrantyUntil: String(formData.get("warrantyUntil") || "") || undefined,
        condition: String(formData.get("condition")) as Condition,
        currentLocationId: String(formData.get("currentLocationId") || "") || undefined,
        notes: String(formData.get("notes") || "") || undefined,
      });
      revalidatePath("/masters/assets");
      redirect("/masters/assets?success=Asset created successfully");
    } catch (error) {
      redirect(`/masters/assets?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleUpdate(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await updateAsset({
        id,
        itemId: String(formData.get("itemId")),
        assetTag: String(formData.get("assetTag")),
        serialNumber: String(formData.get("serialNumber") || "") || undefined,
        purchaseDate: String(formData.get("purchaseDate") || "") || undefined,
        warrantyUntil: String(formData.get("warrantyUntil") || "") || undefined,
        condition: String(formData.get("condition")) as Condition,
        currentLocationId: String(formData.get("currentLocationId") || "") || undefined,
        notes: String(formData.get("notes") || "") || undefined,
      });
      revalidatePath("/masters/assets");
      redirect("/masters/assets?success=Asset updated successfully");
    } catch (error) {
      redirect(`/masters/assets?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleDelete(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await deleteAsset(id);
      revalidatePath("/masters/assets");
      redirect("/masters/assets?success=Asset deleted successfully");
    } catch (error) {
      redirect(`/masters/assets?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Manage individually tracked assets with unique tags."
        icon={<Tag className="h-5 w-5" />}
        actions={
          <Button variant="outline" asChild>
            <Link href="/masters">
              <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
              Back to Masters
            </Link>
          </Button>
        }
      />

      {params?.error && <InlineError message={params.error} />}

      {params?.success && (
        <Alert>
          <AlertDescription>{params.success}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {editingAsset ? "Edit Asset" : "Add New Asset"}
        </h2>
        <form action={editingAsset ? handleUpdate : handleCreate} className="space-y-4">
          {editingAsset && <input type="hidden" name="id" value={editingAsset.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="itemId">Item*</Label>
              <Select
                name="itemId"
                defaultValue={editingAsset?.itemId ?? ""}
                required
              >
                <SelectTrigger id="itemId">
                  <SelectValue placeholder="Select Item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetTag">Asset Tag*</Label>
              <Input
                id="assetTag"
                name="assetTag"
                defaultValue={editingAsset?.assetTag ?? ""}
                required
                placeholder="Unique identifier (e.g., AST-001)"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                defaultValue={editingAsset?.serialNumber ?? ""}
                placeholder="Manufacturer serial number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition*</Label>
              <Select
                name="condition"
                defaultValue={editingAsset?.condition ?? Condition.NEW}
                required
              >
                <SelectTrigger id="condition">
                  <SelectValue />
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">
                <Calendar className="mr-1 inline-block h-4 w-4" />
                Purchase Date
              </Label>
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                defaultValue={formatDate(editingAsset?.purchaseDate ?? null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warrantyUntil">
                <Calendar className="mr-1 inline-block h-4 w-4" />
                Warranty Until
              </Label>
              <Input
                id="warrantyUntil"
                name="warrantyUntil"
                type="date"
                defaultValue={formatDate(editingAsset?.warrantyUntil ?? null)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentLocationId">Current Location</Label>
            <Select
              name="currentLocationId"
              defaultValue={editingAsset?.currentLocationId ?? ""}
            >
              <SelectTrigger id="currentLocationId">
                <SelectValue placeholder="No Location" />
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={editingAsset?.notes ?? ""}
              rows={3}
              placeholder="Additional information about this asset"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {editingAsset ? (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Asset
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Asset
                </>
              )}
            </Button>
            {editingAsset && (
              <Button variant="outline" asChild>
                <Link href="/masters/assets">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        {assets.length === 0 ? (
          <EmptyState
            icon={<Tag className="h-8 w-8" />}
            title="No assets yet"
            description="Create your first asset to start tracking individual items."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.assetTag}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.item.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.serialNumber ?? "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={asset.condition} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.currentLocation 
                        ? `${asset.currentLocation.property.name} - ${asset.currentLocation.name}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/masters/assets?edit=${asset.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <ConfirmActionForm
                          action={handleDelete}
                          confirmMessage="Are you sure you want to delete this asset?"
                          fields={{ id: asset.id }}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </ConfirmActionForm>
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

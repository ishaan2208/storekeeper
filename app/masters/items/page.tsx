import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { List, Plus, Edit, Trash2, X, ChevronRight } from "lucide-react";
import { ItemType } from "@prisma/client";

import { createItem, updateItem, deleteItem } from "@/lib/actions/masters/items";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ItemsPageProps = {
  searchParams?: Promise<{ edit?: string; error?: string; success?: string }>;
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Operation failed.";
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const editingId = params?.edit;

  const [items, categories, editingItem] = await Promise.all([
    prisma.item.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    editingId ? prisma.item.findUnique({ where: { id: editingId } }) : null,
  ]);

  async function handleCreate(formData: FormData) {
    "use server";

    try {
      await createItem({
        name: String(formData.get("name")),
        itemType: String(formData.get("itemType")) as ItemType,
        categoryId: String(formData.get("categoryId")),
        unit: String(formData.get("unit") || "") || undefined,
        reorderLevel: formData.get("reorderLevel") ? Number(formData.get("reorderLevel")) : undefined,
        isActive: formData.get("isActive") === "true",
      });
      revalidatePath("/masters/items");
      redirect("/masters/items?success=Item created successfully");
    } catch (error) {
      redirect(`/masters/items?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleUpdate(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await updateItem({
        id,
        name: String(formData.get("name")),
        itemType: String(formData.get("itemType")) as ItemType,
        categoryId: String(formData.get("categoryId")),
        unit: String(formData.get("unit") || "") || undefined,
        reorderLevel: formData.get("reorderLevel") ? Number(formData.get("reorderLevel")) : undefined,
        isActive: formData.get("isActive") === "true",
      });
      revalidatePath("/masters/items");
      redirect("/masters/items?success=Item updated successfully");
    } catch (error) {
      redirect(`/masters/items?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleDelete(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await deleteItem(id);
      revalidatePath("/masters/items");
      redirect("/masters/items?success=Item deleted successfully");
    } catch (error) {
      redirect(`/masters/items?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items"
        description="Manage inventory items (assets and stock)."
        icon={<List className="h-5 w-5" />}
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
          {editingItem ? "Edit Item" : "Add New Item"}
        </h2>
        <form action={editingItem ? handleUpdate : handleCreate} className="space-y-4">
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name*</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingItem?.name ?? ""}
                required
                placeholder="e.g., Laptop, Cleaning Supplies"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemType">Item Type*</Label>
              <Select
                name="itemType"
                defaultValue={editingItem?.itemType ?? ItemType.STOCK}
                required
              >
                <SelectTrigger id="itemType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ItemType.ASSET}>ASSET (Individually Tracked)</SelectItem>
                  <SelectItem value={ItemType.STOCK}>STOCK (Quantity Tracked)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category*</Label>
              <Select
                name="categoryId"
                defaultValue={editingItem?.categoryId ?? ""}
                required
              >
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit (for stock items)</Label>
              <Input
                id="unit"
                name="unit"
                defaultValue={editingItem?.unit ?? ""}
                placeholder="e.g., pcs, kg, liter"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reorderLevel">Reorder Level</Label>
              <Input
                id="reorderLevel"
                name="reorderLevel"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editingItem?.reorderLevel?.toString() ?? ""}
                placeholder="Minimum stock quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isActive">Status*</Label>
              <Select
                name="isActive"
                defaultValue={editingItem?.isActive ? "true" : "false"}
                required
              >
                <SelectTrigger id="isActive">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {editingItem ? (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Item
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Item
                </>
              )}
            </Button>
            {editingItem && (
              <Button variant="outline" asChild>
                <Link href="/masters/items">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon={<List className="h-8 w-8" />}
            title="No items yet"
            description="Create your first item to start tracking inventory."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.itemType} variant="secondary" />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.unit ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.reorderLevel?.toString() ?? "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/masters/items?edit=${item.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <ConfirmActionForm
                          action={handleDelete}
                          confirmMessage="Are you sure you want to delete this item?"
                          fields={{ id: item.id }}
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

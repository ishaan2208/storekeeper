import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FolderTree, Plus, Edit, Trash2, X, ChevronRight } from "lucide-react";

import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/masters/categories";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineError } from "@/components/ui/inline-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

type CategoriesPageProps = {
  searchParams?: Promise<{ edit?: string; error?: string; success?: string }>;
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Operation failed.";
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const editingId = params?.edit;

  const [categories, editingCategory] = await Promise.all([
    prisma.category.findMany({
      include: { parentCategory: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    editingId ? prisma.category.findUnique({ where: { id: editingId } }) : null,
  ]);

  async function handleCreate(formData: FormData) {
    "use server";

    try {
      await createCategory({
        name: String(formData.get("name")),
        parentCategoryId: String(formData.get("parentCategoryId") || "") || undefined,
      });
      revalidatePath("/masters/categories");
      redirect("/masters/categories?success=Category created successfully");
    } catch (error) {
      redirect(`/masters/categories?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleUpdate(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await updateCategory({
        id,
        name: String(formData.get("name")),
        parentCategoryId: String(formData.get("parentCategoryId") || "") || undefined,
      });
      revalidatePath("/masters/categories");
      redirect("/masters/categories?success=Category updated successfully");
    } catch (error) {
      redirect(`/masters/categories?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleDelete(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await deleteCategory(id);
      revalidatePath("/masters/categories");
      redirect("/masters/categories?success=Category deleted successfully");
    } catch (error) {
      redirect(`/masters/categories?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize items with hierarchical categories."
        icon={<FolderTree className="h-5 w-5" />}
        actions={
          <Button variant="outline" asChild>
            <Link href="/masters">
              <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
              Back to Masters
            </Link>
          </Button>
        }
      />

      {params?.error && (
        <InlineError message={params.error} />
      )}

      {params?.success && (
        <Alert>
          <AlertDescription>{params.success}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {editingCategory ? "Edit Category" : "Add New Category"}
        </h2>
        <form action={editingCategory ? handleUpdate : handleCreate} className="space-y-4">
          {editingCategory && <input type="hidden" name="id" value={editingCategory.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Category Name*</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editingCategory?.name ?? ""}
              required
              placeholder="e.g., Electronics, Furniture, Consumables"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentCategoryId">Parent Category</Label>
            <Select
              name="parentCategoryId"
              defaultValue={editingCategory?.parentCategoryId ?? ""}
            >
              <SelectTrigger id="parentCategoryId">
                <SelectValue placeholder="None (Top Level)" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((cat) => cat.id !== editingId)
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {editingCategory ? (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Category
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Category
                </>
              )}
            </Button>
            {editingCategory && (
              <Button variant="outline" asChild>
                <Link href="/masters/categories">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        {categories.length === 0 ? (
          <EmptyState
            icon={<FolderTree className="h-8 w-8" />}
            title="No categories yet"
            description="Create your first category to organize your inventory items."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.parentCategory?.name ?? "None (Top Level)"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/masters/categories?edit=${category.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <ConfirmActionForm
                          action={handleDelete}
                          confirmMessage="Are you sure you want to delete this category?"
                          fields={{ id: category.id }}
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

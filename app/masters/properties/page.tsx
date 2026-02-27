import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Building, Plus, Edit, Trash2, X, ChevronRight } from "lucide-react";

import { createProperty, updateProperty, deleteProperty } from "@/lib/actions/masters/properties";
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

type PropertiesPageProps = {
  searchParams?: Promise<{ edit?: string; error?: string; success?: string }>;
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Operation failed.";
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const editingId = params?.edit;

  const [properties, editingProperty] = await Promise.all([
    prisma.property.findMany({ orderBy: { name: "asc" } }),
    editingId ? prisma.property.findUnique({ where: { id: editingId } }) : null,
  ]);

  async function handleCreate(formData: FormData) {
    "use server";

    try {
      await createProperty({
        name: String(formData.get("name")),
      });
      revalidatePath("/masters/properties");
      redirect("/masters/properties?success=Property created successfully");
    } catch (error) {
      redirect(`/masters/properties?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleUpdate(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await updateProperty({
        id,
        name: String(formData.get("name")),
      });
      revalidatePath("/masters/properties");
      redirect("/masters/properties?success=Property updated successfully");
    } catch (error) {
      redirect(`/masters/properties?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleDelete(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await deleteProperty(id);
      revalidatePath("/masters/properties");
      redirect("/masters/properties?success=Property deleted successfully");
    } catch (error) {
      redirect(`/masters/properties?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Manage property locations for your organization."
        icon={<Building className="h-5 w-5" />}
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
          {editingProperty ? "Edit Property" : "Add New Property"}
        </h2>
        <form action={editingProperty ? handleUpdate : handleCreate} className="space-y-4">
          {editingProperty && <input type="hidden" name="id" value={editingProperty.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Property Name*</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editingProperty?.name ?? ""}
              required
              placeholder="e.g., Main Hotel, Beach Resort"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {editingProperty ? (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Property
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Property
                </>
              )}
            </Button>
            {editingProperty && (
              <Button variant="outline" asChild>
                <Link href="/masters/properties">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        {properties.length === 0 ? (
          <EmptyState
            icon={<Building className="h-8 w-8" />}
            title="No properties yet"
            description="Create your first property to get started with inventory management."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium">{property.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(property.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/masters/properties?edit=${property.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <ConfirmActionForm
                          action={handleDelete}
                          confirmMessage="Are you sure you want to delete this property?"
                          fields={{ id: property.id }}
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

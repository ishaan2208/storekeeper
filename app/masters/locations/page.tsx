import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MapPin, Plus, Edit, Trash2, X, ChevronRight } from "lucide-react";

import { createLocation, updateLocation, deleteLocation } from "@/lib/actions/masters/locations";
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

type LocationsPageProps = {
  searchParams?: Promise<{ edit?: string; error?: string; success?: string }>;
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Operation failed.";
}

export default async function LocationsPage({ searchParams }: LocationsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const editingId = params?.edit;

  const [locations, properties, editingLocation] = await Promise.all([
    prisma.location.findMany({
      include: { property: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.property.findMany({ orderBy: { name: "asc" } }),
    editingId ? prisma.location.findUnique({ where: { id: editingId } }) : null,
  ]);

  async function handleCreate(formData: FormData) {
    "use server";

    try {
      await createLocation({
        propertyId: String(formData.get("propertyId")),
        name: String(formData.get("name")),
        floor: String(formData.get("floor") || "") || undefined,
        room: String(formData.get("room") || "") || undefined,
        area: String(formData.get("area") || "") || undefined,
      });
      revalidatePath("/masters/locations");
      redirect("/masters/locations?success=Location created successfully");
    } catch (error) {
      redirect(`/masters/locations?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleUpdate(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await updateLocation({
        id,
        propertyId: String(formData.get("propertyId")),
        name: String(formData.get("name")),
        floor: String(formData.get("floor") || "") || undefined,
        room: String(formData.get("room") || "") || undefined,
        area: String(formData.get("area") || "") || undefined,
      });
      revalidatePath("/masters/locations");
      redirect("/masters/locations?success=Location updated successfully");
    } catch (error) {
      redirect(`/masters/locations?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleDelete(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await deleteLocation(id);
      revalidatePath("/masters/locations");
      redirect("/masters/locations?success=Location deleted successfully");
    } catch (error) {
      redirect(`/masters/locations?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Manage storage and department locations within properties."
        icon={<MapPin className="h-5 w-5" />}
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
          {editingLocation ? "Edit Location" : "Add New Location"}
        </h2>
        <form action={editingLocation ? handleUpdate : handleCreate} className="space-y-4">
          {editingLocation && <input type="hidden" name="id" value={editingLocation.id} />}

          <div className="space-y-2">
            <Label htmlFor="propertyId">Property*</Label>
            <Select
              name="propertyId"
              defaultValue={editingLocation?.propertyId ?? ""}
              required
            >
              <SelectTrigger id="propertyId">
                <SelectValue placeholder="Select Property" />
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

          <div className="space-y-2">
            <Label htmlFor="name">Location Name*</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editingLocation?.name ?? ""}
              required
              placeholder="e.g., Main Store, Kitchen Pantry"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                name="floor"
                defaultValue={editingLocation?.floor ?? ""}
                placeholder="e.g., Ground Floor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">Room</Label>
              <Input
                id="room"
                name="room"
                defaultValue={editingLocation?.room ?? ""}
                placeholder="e.g., Room 101"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                name="area"
                defaultValue={editingLocation?.area ?? ""}
                placeholder="e.g., South Wing"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {editingLocation ? (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Location
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Location
                </>
              )}
            </Button>
            {editingLocation && (
              <Button variant="outline" asChild>
                <Link href="/masters/locations">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        {locations.length === 0 ? (
          <EmptyState
            icon={<MapPin className="h-8 w-8" />}
            title="No locations yet"
            description="Create your first location within a property to start managing inventory."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {location.property.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {location.floor ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {location.room ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {location.area ?? "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/masters/locations?edit=${location.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <ConfirmActionForm
                          action={handleDelete}
                          confirmMessage="Are you sure you want to delete this location?"
                          fields={{ id: location.id }}
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

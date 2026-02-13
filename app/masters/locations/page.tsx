import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createLocation, updateLocation, deleteLocation } from "@/lib/actions/masters/locations";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Locations</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Manage storage and department locations within properties.
          </p>
        </div>
        <Link
          href="/"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Back to Home
        </Link>
      </header>

      {params?.error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {params.error}
        </div>
      )}

      {params?.success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {params.success}
        </div>
      )}

      <section className="rounded-lg border bg-white p-6 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">
          {editingLocation ? "Edit Location" : "Add New Location"}
        </h2>
        <form action={editingLocation ? handleUpdate : handleCreate} className="space-y-4">
          {editingLocation && <input type="hidden" name="id" value={editingLocation.id} />}

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Property*</span>
            <select
              name="propertyId"
              defaultValue={editingLocation?.propertyId ?? ""}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value="">Select Property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Location Name*</span>
            <input
              type="text"
              name="name"
              defaultValue={editingLocation?.name ?? ""}
              className="w-full rounded border px-3 py-2"
              required
              placeholder="e.g., Main Store, Kitchen Pantry"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Floor</span>
              <input
                type="text"
                name="floor"
                defaultValue={editingLocation?.floor ?? ""}
                className="w-full rounded border px-3 py-2"
                placeholder="e.g., Ground Floor, 2nd Floor"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Room</span>
              <input
                type="text"
                name="room"
                defaultValue={editingLocation?.room ?? ""}
                className="w-full rounded border px-3 py-2"
                placeholder="e.g., Room 101"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Area</span>
              <input
                type="text"
                name="area"
                defaultValue={editingLocation?.area ?? ""}
                className="w-full rounded border px-3 py-2"
                placeholder="e.g., South Wing"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {editingLocation ? "Update Location" : "Create Location"}
            </button>
            {editingLocation && (
              <Link
                href="/masters/locations"
                className="rounded border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </Link>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {locations.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No locations found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Name</th>
                  <th className="border-b px-3 py-2">Property</th>
                  <th className="border-b px-3 py-2">Floor</th>
                  <th className="border-b px-3 py-2">Room</th>
                  <th className="border-b px-3 py-2">Area</th>
                  <th className="border-b px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => (
                  <tr key={location.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="border-b px-3 py-2 font-medium">{location.name}</td>
                    <td className="border-b px-3 py-2">{location.property.name}</td>
                    <td className="border-b px-3 py-2">{location.floor ?? "-"}</td>
                    <td className="border-b px-3 py-2">{location.room ?? "-"}</td>
                    <td className="border-b px-3 py-2">{location.area ?? "-"}</td>
                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <Link
                          href={`/masters/locations?edit=${location.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Edit
                        </Link>
                        <form action={handleDelete} className="inline">
                          <input type="hidden" name="id" value={location.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:underline dark:text-red-400"
                            onClick={(e) => {
                              if (!confirm("Are you sure you want to delete this location?")) {
                                e.preventDefault();
                              }
                            }}
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

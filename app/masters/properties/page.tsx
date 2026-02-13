import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createProperty, updateProperty, deleteProperty } from "@/lib/actions/masters/properties";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Properties</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Manage property locations for your organization.
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
          {editingProperty ? "Edit Property" : "Add New Property"}
        </h2>
        <form action={editingProperty ? handleUpdate : handleCreate} className="space-y-4">
          {editingProperty && <input type="hidden" name="id" value={editingProperty.id} />}

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Property Name*</span>
            <input
              type="text"
              name="name"
              defaultValue={editingProperty?.name ?? ""}
              className="w-full rounded border px-3 py-2"
              required
              placeholder="e.g., Main Hotel, Beach Resort"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {editingProperty ? "Update Property" : "Create Property"}
            </button>
            {editingProperty && (
              <Link
                href="/masters/properties"
                className="rounded border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </Link>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {properties.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No properties found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Name</th>
                  <th className="border-b px-3 py-2">Created</th>
                  <th className="border-b px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr key={property.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="border-b px-3 py-2 font-medium">{property.name}</td>
                    <td className="border-b px-3 py-2">
                      {new Date(property.createdAt).toLocaleDateString()}
                    </td>
                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <Link
                          href={`/masters/properties?edit=${property.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Edit
                        </Link>
                        <form action={handleDelete} className="inline">
                          <input type="hidden" name="id" value={property.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:underline dark:text-red-400"
                            onClick={(e) => {
                              if (!confirm("Are you sure you want to delete this property?")) {
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

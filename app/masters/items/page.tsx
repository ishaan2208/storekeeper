import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ItemType } from "@prisma/client";

import { createItem, updateItem, deleteItem } from "@/lib/actions/masters/items";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Items</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Manage inventory items (assets and stock).
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
        <h2 className="mb-4 text-lg font-medium">{editingItem ? "Edit Item" : "Add New Item"}</h2>
        <form action={editingItem ? handleUpdate : handleCreate} className="space-y-4">
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Item Name*</span>
              <input
                type="text"
                name="name"
                defaultValue={editingItem?.name ?? ""}
                className="w-full rounded border px-3 py-2"
                required
                placeholder="e.g., Laptop, Cleaning Supplies"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Item Type*</span>
              <select
                name="itemType"
                defaultValue={editingItem?.itemType ?? ItemType.STOCK}
                className="w-full rounded border px-3 py-2"
                required
              >
                <option value={ItemType.ASSET}>ASSET (Individually Tracked)</option>
                <option value={ItemType.STOCK}>STOCK (Quantity Tracked)</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Category*</span>
              <select
                name="categoryId"
                defaultValue={editingItem?.categoryId ?? ""}
                className="w-full rounded border px-3 py-2"
                required
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Unit (for stock items)</span>
              <input
                type="text"
                name="unit"
                defaultValue={editingItem?.unit ?? ""}
                className="w-full rounded border px-3 py-2"
                placeholder="e.g., pcs, kg, liter"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Reorder Level</span>
              <input
                type="number"
                name="reorderLevel"
                defaultValue={editingItem?.reorderLevel?.toString() ?? ""}
                className="w-full rounded border px-3 py-2"
                min="0"
                step="0.01"
                placeholder="Minimum stock quantity"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Status*</span>
              <select
                name="isActive"
                defaultValue={editingItem?.isActive ? "true" : "false"}
                className="w-full rounded border px-3 py-2"
                required
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {editingItem ? "Update Item" : "Create Item"}
            </button>
            {editingItem && (
              <Link href="/masters/items" className="rounded border px-4 py-2 text-sm font-medium">
                Cancel
              </Link>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No items found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Name</th>
                  <th className="border-b px-3 py-2">Type</th>
                  <th className="border-b px-3 py-2">Category</th>
                  <th className="border-b px-3 py-2">Unit</th>
                  <th className="border-b px-3 py-2">Reorder Level</th>
                  <th className="border-b px-3 py-2">Status</th>
                  <th className="border-b px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="border-b px-3 py-2 font-medium">{item.name}</td>
                    <td className="border-b px-3 py-2">{item.itemType}</td>
                    <td className="border-b px-3 py-2">{item.category.name}</td>
                    <td className="border-b px-3 py-2">{item.unit ?? "-"}</td>
                    <td className="border-b px-3 py-2">{item.reorderLevel?.toString() ?? "-"}</td>
                    <td className="border-b px-3 py-2">
                      <span
                        className={
                          item.isActive
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <Link
                          href={`/masters/items?edit=${item.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Edit
                        </Link>
                        <form action={handleDelete} className="inline">
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:underline dark:text-red-400"
                            onClick={(e) => {
                              if (!confirm("Are you sure you want to delete this item?")) {
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

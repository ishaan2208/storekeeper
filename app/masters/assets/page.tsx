import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Condition, ItemType } from "@prisma/client";

import { createAsset, updateAsset, deleteAsset } from "@/lib/actions/masters/assets";
import { prisma } from "@/lib/prisma";

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
        currentLocation: { select: { name: true } },
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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assets</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Manage individually tracked assets with unique tags.
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
        <h2 className="mb-4 text-lg font-medium">{editingAsset ? "Edit Asset" : "Add New Asset"}</h2>
        <form action={editingAsset ? handleUpdate : handleCreate} className="space-y-4">
          {editingAsset && <input type="hidden" name="id" value={editingAsset.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Item*</span>
              <select
                name="itemId"
                defaultValue={editingAsset?.itemId ?? ""}
                className="w-full rounded border px-3 py-2"
                required
              >
                <option value="">Select Item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Asset Tag*</span>
              <input
                type="text"
                name="assetTag"
                defaultValue={editingAsset?.assetTag ?? ""}
                className="w-full rounded border px-3 py-2"
                required
                placeholder="Unique identifier"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Serial Number</span>
              <input
                type="text"
                name="serialNumber"
                defaultValue={editingAsset?.serialNumber ?? ""}
                className="w-full rounded border px-3 py-2"
                placeholder="Manufacturer serial"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Condition*</span>
              <select
                name="condition"
                defaultValue={editingAsset?.condition ?? Condition.NEW}
                className="w-full rounded border px-3 py-2"
                required
              >
                {Object.values(Condition).map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Purchase Date</span>
              <input
                type="date"
                name="purchaseDate"
                defaultValue={formatDate(editingAsset?.purchaseDate ?? null)}
                className="w-full rounded border px-3 py-2"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Warranty Until</span>
              <input
                type="date"
                name="warrantyUntil"
                defaultValue={formatDate(editingAsset?.warrantyUntil ?? null)}
                className="w-full rounded border px-3 py-2"
              />
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Current Location</span>
            <select
              name="currentLocationId"
              defaultValue={editingAsset?.currentLocationId ?? ""}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">No Location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.property.name} - {location.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Notes</span>
            <textarea
              name="notes"
              defaultValue={editingAsset?.notes ?? ""}
              className="w-full rounded border px-3 py-2"
              rows={3}
              placeholder="Additional information"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {editingAsset ? "Update Asset" : "Create Asset"}
            </button>
            {editingAsset && (
              <Link
                href="/masters/assets"
                className="rounded border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </Link>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {assets.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No assets found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Asset Tag</th>
                  <th className="border-b px-3 py-2">Item</th>
                  <th className="border-b px-3 py-2">Serial Number</th>
                  <th className="border-b px-3 py-2">Condition</th>
                  <th className="border-b px-3 py-2">Location</th>
                  <th className="border-b px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="border-b px-3 py-2 font-medium">{asset.assetTag}</td>
                    <td className="border-b px-3 py-2">{asset.item.name}</td>
                    <td className="border-b px-3 py-2">{asset.serialNumber ?? "-"}</td>
                    <td className="border-b px-3 py-2">{asset.condition}</td>
                    <td className="border-b px-3 py-2">{asset.currentLocation?.name ?? "-"}</td>
                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <Link
                          href={`/masters/assets?edit=${asset.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Edit
                        </Link>
                        <form action={handleDelete} className="inline">
                          <input type="hidden" name="id" value={asset.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:underline dark:text-red-400"
                            onClick={(e) => {
                              if (!confirm("Are you sure you want to delete this asset?")) {
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

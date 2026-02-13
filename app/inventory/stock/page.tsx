import Link from "next/link";
import { ItemType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type StockPageProps = {
  searchParams?: Promise<{
    search?: string;
    locationId?: string;
    lowStock?: string;
  }>;
};

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = searchParams ? await searchParams : undefined;

  const searchQuery = params?.search ?? "";
  const locationIdFilter = params?.locationId;
  const lowStockFilter = params?.lowStock === "true";

  const [stockBalances, locations] = await Promise.all([
    prisma.stockBalance.findMany({
      where: {
        ...(locationIdFilter && { locationId: locationIdFilter }),
        item: {
          itemType: ItemType.STOCK,
          isActive: true,
          ...(searchQuery && {
            name: {
              contains: searchQuery,
              mode: "insensitive" as const,
            },
          }),
        },
      },
      include: {
        item: {
          select: {
            name: true,
            unit: true,
            reorderLevel: true,
            category: { select: { name: true } },
          },
        },
        location: {
          select: {
            name: true,
            property: { select: { name: true } },
          },
        },
      },
      orderBy: [{ item: { name: "asc" } }, { location: { name: "asc" } }],
    }),
    prisma.location.findMany({
      include: { property: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  // Filter for low stock
  const filteredBalances = lowStockFilter
    ? stockBalances.filter(
        (balance) =>
          balance.item.reorderLevel &&
          Number(balance.qtyOnHand) < Number(balance.item.reorderLevel)
      )
    : stockBalances;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Stock Inventory</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          View quantity-tracked items across all locations.
        </p>
      </header>

      <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">Filters</h2>
        <form method="get" className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span>Search Item</span>
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search by item name"
              className="w-full rounded border px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Location</span>
            <select
              name="locationId"
              defaultValue={locationIdFilter ?? ""}
              className="w-full rounded border px-2 py-2"
            >
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.property.name} - {location.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="lowStock"
              value="true"
              defaultChecked={lowStockFilter}
              className="h-4 w-4"
            />
            <span>Show Low Stock Only</span>
          </label>

          <div className="flex items-end gap-2 sm:col-span-3">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Apply Filters
            </button>
            <Link
              href="/inventory/stock"
              className="rounded border px-4 py-2 text-sm font-medium"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {filteredBalances.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No stock items found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Item</th>
                  <th className="border-b px-3 py-2">Category</th>
                  <th className="border-b px-3 py-2">Location</th>
                  <th className="border-b px-3 py-2">Property</th>
                  <th className="border-b px-3 py-2">Qty on Hand</th>
                  <th className="border-b px-3 py-2">Unit</th>
                  <th className="border-b px-3 py-2">Reorder Level</th>
                  <th className="border-b px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map((balance) => {
                  const qtyOnHand = Number(balance.qtyOnHand);
                  const reorderLevel = balance.item.reorderLevel
                    ? Number(balance.item.reorderLevel)
                    : null;
                  const isLowStock =
                    reorderLevel !== null && qtyOnHand < reorderLevel;

                  return (
                    <tr
                      key={balance.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <td className="border-b px-3 py-2 font-medium">
                        {balance.item.name}
                      </td>
                      <td className="border-b px-3 py-2">
                        {balance.item.category.name}
                      </td>
                      <td className="border-b px-3 py-2">
                        {balance.location.name}
                      </td>
                      <td className="border-b px-3 py-2">
                        {balance.location.property.name}
                      </td>
                      <td className="border-b px-3 py-2 font-medium">
                        {qtyOnHand.toFixed(2)}
                      </td>
                      <td className="border-b px-3 py-2">
                        {balance.item.unit ?? "-"}
                      </td>
                      <td className="border-b px-3 py-2">
                        {reorderLevel !== null ? reorderLevel.toFixed(2) : "-"}
                      </td>
                      <td className="border-b px-3 py-2">
                        {isLowStock ? (
                          <span className="inline-block rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-100">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <Link
          href="/"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Back to Home
        </Link>
      </section>
    </main>
  );
}

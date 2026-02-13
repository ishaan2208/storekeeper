import Link from "next/link";
import { Condition, ItemType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AssetsInventoryPageProps = {
  searchParams?: Promise<{
    search?: string;
    condition?: string;
    locationId?: string;
  }>;
};

function conditionColor(condition: Condition): string {
  switch (condition) {
    case "NEW":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case "GOOD":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "WORN":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    case "DAMAGED":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    case "UNDER_MAINTENANCE":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
    case "SCRAP":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";
  }
}

export default async function AssetsInventoryPage({
  searchParams,
}: AssetsInventoryPageProps) {
  const params = searchParams ? await searchParams : undefined;

  const searchQuery = params?.search ?? "";
  const conditionFilter = params?.condition as Condition | undefined;
  const locationIdFilter = params?.locationId;

  const [assets, locations] = await Promise.all([
    prisma.asset.findMany({
      where: {
        ...(conditionFilter && { condition: conditionFilter }),
        ...(locationIdFilter && { currentLocationId: locationIdFilter }),
        item: {
          itemType: ItemType.ASSET,
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
            category: { select: { name: true } },
          },
        },
        currentLocation: {
          select: {
            name: true,
            property: { select: { name: true } },
          },
        },
        maintenanceTickets: {
          select: { status: true },
          where: { closedAt: null },
          take: 1,
        },
      },
      orderBy: { assetTag: "asc" },
    }),
    prisma.location.findMany({
      include: { property: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Asset Inventory</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          View individually tracked assets with their current status.
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
            <span>Condition</span>
            <select
              name="condition"
              defaultValue={conditionFilter ?? ""}
              className="w-full rounded border px-2 py-2"
            >
              <option value="">All Conditions</option>
              {Object.values(Condition).map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
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

          <div className="flex items-end gap-2 sm:col-span-3">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Apply Filters
            </button>
            <Link
              href="/inventory/assets"
              className="rounded border px-4 py-2 text-sm font-medium"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {assets.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No assets found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Asset Tag</th>
                  <th className="border-b px-3 py-2">Item</th>
                  <th className="border-b px-3 py-2">Category</th>
                  <th className="border-b px-3 py-2">Condition</th>
                  <th className="border-b px-3 py-2">Location</th>
                  <th className="border-b px-3 py-2">Property</th>
                  <th className="border-b px-3 py-2">Status</th>
                  <th className="border-b px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const hasOpenMaintenance =
                    asset.maintenanceTickets.length > 0;

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <td className="border-b px-3 py-2 font-medium">
                        {asset.assetTag}
                      </td>
                      <td className="border-b px-3 py-2">{asset.item.name}</td>
                      <td className="border-b px-3 py-2">
                        {asset.item.category.name}
                      </td>
                      <td className="border-b px-3 py-2">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-medium ${conditionColor(
                            asset.condition
                          )}`}
                        >
                          {asset.condition}
                        </span>
                      </td>
                      <td className="border-b px-3 py-2">
                        {asset.currentLocation ? (
                          <span
                            className={`inline-block rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100`}
                          >
                            {asset.currentLocation.name}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="border-b px-3 py-2">
                        {asset.currentLocation?.property.name ?? "-"}
                      </td>
                      <td className="border-b px-3 py-2">
                        {hasOpenMaintenance ? (
                          <span className="inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                            {asset.maintenanceTickets[0].status}
                          </span>
                        ) : (
                          <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="border-b px-3 py-2">
                        <Link
                          href={`/inventory/assets/${asset.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View
                        </Link>
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

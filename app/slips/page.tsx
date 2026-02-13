import { DepartmentType, SlipType } from "@prisma/client";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

type SlipsListPageProps = {
  searchParams?: Promise<{
    slipType?: string;
    department?: string;
    propertyId?: string;
  }>;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function SlipsListPage({ searchParams }: SlipsListPageProps) {
  const params = searchParams ? await searchParams : undefined;

  const slipTypeFilter = params?.slipType as SlipType | undefined;
  const departmentFilter = params?.department as DepartmentType | undefined;
  const propertyIdFilter = params?.propertyId;

  const [slips, properties] = await Promise.all([
    prisma.slip.findMany({
      where: {
        ...(slipTypeFilter && { slipType: slipTypeFilter }),
        ...(departmentFilter && { department: departmentFilter }),
        ...(propertyIdFilter && { propertyId: propertyIdFilter }),
      },
      include: {
        property: { select: { name: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        lines: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.property.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">All Slips</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          View and filter recent movement slips.
        </p>
      </header>

      <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">Filters</h2>
        <form method="get" className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span>Slip Type</span>
            <select
              name="slipType"
              defaultValue={slipTypeFilter ?? ""}
              className="w-full rounded border px-2 py-2"
            >
              <option value="">All</option>
              {Object.values(SlipType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Department</span>
            <select
              name="department"
              defaultValue={departmentFilter ?? ""}
              className="w-full rounded border px-2 py-2"
            >
              <option value="">All</option>
              {Object.values(DepartmentType).map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Property</span>
            <select
              name="propertyId"
              defaultValue={propertyIdFilter ?? ""}
              className="w-full rounded border px-2 py-2"
            >
              <option value="">All</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
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
              href="/slips"
              className="rounded border px-4 py-2 text-sm font-medium"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {slips.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No slips found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Slip No</th>
                  <th className="border-b px-3 py-2">Type</th>
                  <th className="border-b px-3 py-2">Property</th>
                  <th className="border-b px-3 py-2">Department</th>
                  <th className="border-b px-3 py-2">From</th>
                  <th className="border-b px-3 py-2">To</th>
                  <th className="border-b px-3 py-2">Lines</th>
                  <th className="border-b px-3 py-2">Created</th>
                  <th className="border-b px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="border-b px-3 py-2 font-medium">{slip.slipNo}</td>
                    <td className="border-b px-3 py-2">{slip.slipType}</td>
                    <td className="border-b px-3 py-2">{slip.property.name}</td>
                    <td className="border-b px-3 py-2">{slip.department}</td>
                    <td className="border-b px-3 py-2">{slip.fromLocation?.name ?? "-"}</td>
                    <td className="border-b px-3 py-2">{slip.toLocation?.name ?? "-"}</td>
                    <td className="border-b px-3 py-2">{slip.lines.length}</td>
                    <td className="border-b px-3 py-2">{formatDate(slip.createdAt)}</td>
                    <td className="border-b px-3 py-2">
                      <Link
                        href={`/slips/${slip.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href="/slips/new/issue"
          className="rounded border bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          + Issue
        </Link>
        <Link
          href="/slips/new/return"
          className="rounded border bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          + Return
        </Link>
        <Link
          href="/slips/new/transfer"
          className="rounded border bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          + Transfer
        </Link>
      </section>
    </main>
  );
}

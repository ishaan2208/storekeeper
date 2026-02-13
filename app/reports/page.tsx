import Link from "next/link";

import { requireSessionOrThrow } from "@/lib/auth-server";

export default async function ReportsLandingPage() {
  await requireSessionOrThrow();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Generate and analyze various operational reports with advanced filtering.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Available Reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/reports/issues"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Issues Report</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Track all ISSUE_OUT movements with date range, property, location, department, and item type filters.
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Summary: Total issues, quantity issued
            </p>
          </Link>

          <Link
            href="/reports/maintenance"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Maintenance Report</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Comprehensive maintenance ticket analysis with cost tracking, status, and vendor information.
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Summary: Total tickets, open tickets, estimated & actual costs
            </p>
          </Link>

          <Link
            href="/reports/damage-scrap"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Damage & Scrap Report</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Monitor damage reports and scrapped assets with approval tracking and detailed filtering.
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Summary: Damage reports, scrap movements, approval status
            </p>
          </Link>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Report Features</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Server-rendered for fast performance with large datasets</li>
          <li>Advanced filtering by date range, property, location, and more</li>
          <li>Summary statistics for quick insights</li>
          <li>Print-friendly layouts for documentation</li>
          <li>Up to 500 records per report for detailed analysis</li>
          <li>Real-time data from the database</li>
        </ul>
      </section>

      <section className="rounded-xl border bg-zinc-50 p-5 shadow-sm dark:bg-zinc-800">
        <h2 className="text-lg font-medium">Tips</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Use date filters to focus on specific time periods</li>
          <li>Combine multiple filters for more granular analysis</li>
          <li>Click &quot;Print&quot; button on any report to generate a printable version</li>
          <li>Summary cards provide quick KPIs at a glance</li>
          <li>Clear filters button resets all selections</li>
        </ul>
      </section>
    </main>
  );
}

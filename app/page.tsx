import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Storekeeper</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Internal inventory and maintenance tracker for your organization.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Daily Operations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/slips/new/issue"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Issue Items</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Send equipment or consumables from one location to another.
            </p>
          </Link>

          <Link
            href="/slips/new/return"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Return Items</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Record items coming back and update the condition if needed.
            </p>
          </Link>

          <Link
            href="/slips/new/transfer"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Transfer Items</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Move items between locations or properties without issue/return flow.
            </p>
          </Link>

          <Link
            href="/slips"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">View All Slips</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Browse and filter movement history.
            </p>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Inventory Views</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/inventory/stock"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Stock Inventory</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              View quantity-tracked items with low-stock indicators.
            </p>
          </Link>

          <Link
            href="/inventory/assets"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Asset Inventory</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Track individually tagged assets with condition and status.
            </p>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Maintenance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/maintenance"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Maintenance Tickets</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              View and manage asset maintenance activities and repairs.
            </p>
          </Link>

          <Link
            href="/maintenance/new"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Report Issue</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Create a new maintenance ticket for a broken or damaged asset.
            </p>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Reports & Analytics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/reports/issues"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Issues Report</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Track all issue movements with advanced filtering.
            </p>
          </Link>

          <Link
            href="/reports/maintenance"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Maintenance Report</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Analyze maintenance tickets with cost tracking.
            </p>
          </Link>

          <Link
            href="/reports/damage-scrap"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Damage & Scrap</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Monitor damage reports and scrapped assets.
            </p>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Master Data</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/masters/properties"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Properties</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Manage hotel properties and facilities.
            </p>
          </Link>

          <Link
            href="/masters/locations"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Locations</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Manage storage and department locations.
            </p>
          </Link>

          <Link
            href="/masters/categories"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Categories</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Organize items with hierarchical categories.
            </p>
          </Link>

          <Link
            href="/masters/items"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Items</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Manage inventory items (assets and stock).
            </p>
          </Link>

          <Link
            href="/masters/assets"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Assets</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Track individual assets with unique tags.
            </p>
          </Link>

          <Link
            href="/users"
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-zinc-400 dark:bg-zinc-900"
          >
            <p className="text-lg font-medium">Users</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Manage system users and roles (Admin only).
            </p>
          </Link>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Quick Guide</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Use Issue Items when stock or equipment is sent out.</li>
          <li>Use Return Items when stock or equipment is received back.</li>
          <li>Use Transfer Items for simple location-to-location moves.</li>
          <li>Set up master data (properties, locations, categories, items) before creating slips.</li>
          <li>All create/update operations are logged in the audit trail.</li>
        </ul>
      </section>
    </main>
  );
}

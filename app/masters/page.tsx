import Link from "next/link";

export default function MastersPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Master Data</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Manage all your organization master data including properties, locations, categories, items, and assets.
          </p>
        </div>
        <Link
          href="/"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Back to Home
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Master Data Sections</h2>
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
        <h2 className="text-lg font-medium">Master Data Guide</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            <strong>Properties:</strong> Define the physical properties or facilities where inventory is managed.
          </li>
          <li>
            <strong>Locations:</strong> Set up specific locations within properties (e.g., rooms, floors, areas).
          </li>
          <li>
            <strong>Categories:</strong> Organize items into hierarchical categories for better classification.
          </li>
          <li>
            <strong>Items:</strong> Create items that can be tracked as either assets (individual) or stock (quantity-based).
          </li>
          <li>
            <strong>Assets:</strong> Register individual assets with unique tags, serial numbers, and condition tracking.
          </li>
          <li>
            <strong>Users:</strong> Manage user accounts and assign appropriate roles for system access.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950">
        <h2 className="text-lg font-medium text-blue-900 dark:text-blue-100">Setup Sequence</h2>
        <p className="mt-2 text-sm text-blue-800 dark:text-blue-200">
          For a new installation, set up master data in this order:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-blue-800 dark:text-blue-200">
          <li>Create Properties (where your operations are located)</li>
          <li>Create Locations within each property</li>
          <li>Set up Categories to organize your items</li>
          <li>Add Items (both assets and stock types)</li>
          <li>Register Assets for individually tracked items</li>
          <li>Create Users and assign appropriate roles</li>
        </ol>
      </section>
    </main>
  );
}

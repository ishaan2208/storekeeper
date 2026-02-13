import Link from "next/link";

type FilterActionsProps = {
  clearHref: string;
};

export function FilterActions({ clearHref }: FilterActionsProps) {
  return (
    <div className="flex items-end gap-2 sm:col-span-full">
      <button
        type="submit"
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        Apply Filters
      </button>
      <Link
        href={clearHref}
        className="rounded border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        Clear
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="ml-auto rounded border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        Print
      </button>
    </div>
  );
}

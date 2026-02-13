import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/masters/categories";
import { prisma } from "@/lib/prisma";

type CategoriesPageProps = {
  searchParams?: Promise<{ edit?: string; error?: string; success?: string }>;
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Operation failed.";
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const editingId = params?.edit;

  const [categories, editingCategory] = await Promise.all([
    prisma.category.findMany({
      include: { parentCategory: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    editingId ? prisma.category.findUnique({ where: { id: editingId } }) : null,
  ]);

  async function handleCreate(formData: FormData) {
    "use server";

    try {
      await createCategory({
        name: String(formData.get("name")),
        parentCategoryId: String(formData.get("parentCategoryId") || "") || undefined,
      });
      revalidatePath("/masters/categories");
      redirect("/masters/categories?success=Category created successfully");
    } catch (error) {
      redirect(`/masters/categories?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleUpdate(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await updateCategory({
        id,
        name: String(formData.get("name")),
        parentCategoryId: String(formData.get("parentCategoryId") || "") || undefined,
      });
      revalidatePath("/masters/categories");
      redirect("/masters/categories?success=Category updated successfully");
    } catch (error) {
      redirect(`/masters/categories?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleDelete(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await deleteCategory(id);
      revalidatePath("/masters/categories");
      redirect("/masters/categories?success=Category deleted successfully");
    } catch (error) {
      redirect(`/masters/categories?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Organize items with hierarchical categories.
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
          {editingCategory ? "Edit Category" : "Add New Category"}
        </h2>
        <form action={editingCategory ? handleUpdate : handleCreate} className="space-y-4">
          {editingCategory && <input type="hidden" name="id" value={editingCategory.id} />}

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Category Name*</span>
            <input
              type="text"
              name="name"
              defaultValue={editingCategory?.name ?? ""}
              className="w-full rounded border px-3 py-2"
              required
              placeholder="e.g., Electronics, Furniture, Consumables"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Parent Category</span>
            <select
              name="parentCategoryId"
              defaultValue={editingCategory?.parentCategoryId ?? ""}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">None (Top Level)</option>
              {categories
                .filter((cat) => cat.id !== editingId)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {editingCategory ? "Update Category" : "Create Category"}
            </button>
            {editingCategory && (
              <Link
                href="/masters/categories"
                className="rounded border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </Link>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {categories.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No categories found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Name</th>
                  <th className="border-b px-3 py-2">Parent Category</th>
                  <th className="border-b px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="border-b px-3 py-2 font-medium">{category.name}</td>
                    <td className="border-b px-3 py-2">
                      {category.parentCategory?.name ?? "None (Top Level)"}
                    </td>
                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <Link
                          href={`/masters/categories?edit=${category.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Edit
                        </Link>
                        <form action={handleDelete} className="inline">
                          <input type="hidden" name="id" value={category.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:underline dark:text-red-400"
                            onClick={(e) => {
                              if (!confirm("Are you sure you want to delete this category?")) {
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

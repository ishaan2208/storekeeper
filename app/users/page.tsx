import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

import { createUser, updateUser, deleteUser } from "@/lib/actions/masters/users";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow } from "@/lib/auth-server";
import { assertPermission, canManageUsers } from "@/lib/permissions";

type UsersPageProps = {
  searchParams?: Promise<{ edit?: string; error?: string; success?: string }>;
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Operation failed.";
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await requireSessionOrThrow();
  assertPermission(canManageUsers(session.role), "You do not have permission to manage users.");

  const params = searchParams ? await searchParams : undefined;
  const editingId = params?.edit;

  const [users, editingUser] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    editingId ? prisma.user.findUnique({ where: { id: editingId } }) : null,
  ]);

  async function handleCreate(formData: FormData) {
    "use server";

    try {
      await createUser({
        name: String(formData.get("name")),
        phone: String(formData.get("phone") || "") || undefined,
        role: String(formData.get("role")) as Role,
      });
      revalidatePath("/users");
      redirect("/users?success=User created successfully");
    } catch (error) {
      redirect(`/users?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleUpdate(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await updateUser({
        id,
        name: String(formData.get("name")),
        phone: String(formData.get("phone") || "") || undefined,
        role: String(formData.get("role")) as Role,
      });
      revalidatePath("/users");
      redirect("/users?success=User updated successfully");
    } catch (error) {
      redirect(`/users?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  async function handleDelete(formData: FormData) {
    "use server";

    try {
      const id = String(formData.get("id"));
      await deleteUser(id);
      revalidatePath("/users");
      redirect("/users?success=User deleted successfully");
    } catch (error) {
      redirect(`/users?error=${encodeURIComponent(messageFromError(error))}`);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Manage system users and their roles (Admin only).
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
        <h2 className="mb-4 text-lg font-medium">{editingUser ? "Edit User" : "Add New User"}</h2>
        <form action={editingUser ? handleUpdate : handleCreate} className="space-y-4">
          {editingUser && <input type="hidden" name="id" value={editingUser.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Name*</span>
              <input
                type="text"
                name="name"
                defaultValue={editingUser?.name ?? ""}
                className="w-full rounded border px-3 py-2"
                required
                placeholder="Full name"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Phone</span>
              <input
                type="tel"
                name="phone"
                defaultValue={editingUser?.phone ?? ""}
                className="w-full rounded border px-3 py-2"
                placeholder="Contact number"
              />
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Role*</span>
            <select
              name="role"
              defaultValue={editingUser?.role ?? Role.DEPARTMENT_USER}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value={Role.ADMIN}>ADMIN</option>
              <option value={Role.STORE_MANAGER}>STORE_MANAGER</option>
              <option value={Role.DEPARTMENT_USER}>DEPARTMENT_USER</option>
              <option value={Role.TECHNICIAN}>TECHNICIAN</option>
            </select>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              ADMIN: Full access | STORE_MANAGER: Manage inventory | DEPARTMENT_USER: Request items | TECHNICIAN: Maintenance
            </p>
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {editingUser ? "Update User" : "Create User"}
            </button>
            {editingUser && (
              <Link href="/users" className="rounded border px-4 py-2 text-sm font-medium">
                Cancel
              </Link>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white dark:bg-zinc-900">
        {users.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
            No users found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left dark:bg-zinc-800">
                  <th className="border-b px-3 py-2">Name</th>
                  <th className="border-b px-3 py-2">Phone</th>
                  <th className="border-b px-3 py-2">Role</th>
                  <th className="border-b px-3 py-2">Created</th>
                  <th className="border-b px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="border-b px-3 py-2 font-medium">{user.name}</td>
                    <td className="border-b px-3 py-2">{user.phone ?? "-"}</td>
                    <td className="border-b px-3 py-2">{user.role}</td>
                    <td className="border-b px-3 py-2">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <Link
                          href={`/users?edit=${user.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Edit
                        </Link>
                        <form action={handleDelete} className="inline">
                          <input type="hidden" name="id" value={user.id} />
                          <button
                            type="submit"
                            className="text-red-600 hover:underline dark:text-red-400"
                            onClick={(e) => {
                              if (!confirm("Are you sure you want to delete this user?")) {
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

import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Users as UsersIcon, Plus, Edit, Trash2, X, ChevronRight, Phone, Shield } from "lucide-react";
import { Role } from "@prisma/client";

import { createUser, updateUser, deleteUser } from "@/lib/actions/masters/users";
import { prisma } from "@/lib/prisma";
import { requireSessionOrThrow } from "@/lib/auth-server";
import { assertPermission, canManageUsers } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineError } from "@/components/ui/inline-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UsersPageProps = {
  searchParams?: Promise<{ edit?: string; error?: string; success?: string }>;
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Operation failed.";
}

const roleDescriptions = {
  [Role.ADMIN]: "Full system access",
  [Role.STORE_MANAGER]: "Manage inventory",
  [Role.DEPARTMENT_USER]: "Request items",
  [Role.TECHNICIAN]: "Maintenance tasks",
};

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
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage system users and their roles (Admin only)."
        icon={<UsersIcon className="h-5 w-5" />}
        actions={
          <Button variant="outline" asChild>
            <Link href="/">
              <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
              Back to Home
            </Link>
          </Button>
        }
      />

      {params?.error && <InlineError message={params.error} />}

      {params?.success && (
        <Alert>
          <AlertDescription>{params.success}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {editingUser ? "Edit User" : "Add New User"}
        </h2>
        <form action={editingUser ? handleUpdate : handleCreate} className="space-y-4">
          {editingUser && <input type="hidden" name="id" value={editingUser.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name*</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingUser?.name ?? ""}
                required
                placeholder="Full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="mr-1 inline-block h-4 w-4" />
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={editingUser?.phone ?? ""}
                placeholder="Contact number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              <Shield className="mr-1 inline-block h-4 w-4" />
              Role*
            </Label>
            <Select
              name="role"
              defaultValue={editingUser?.role ?? Role.DEPARTMENT_USER}
              required
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Role).map((role) => (
                  <SelectItem key={role} value={role}>
                    {role} - {roleDescriptions[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the appropriate role based on user responsibilities
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {editingUser ? (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update User
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
            {editingUser && (
              <Button variant="outline" asChild>
                <Link href="/users">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        {users.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-8 w-8" />}
            title="No users yet"
            description="Create your first user to get started with the system."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.phone ?? "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.role} variant="secondary" />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/users?edit=${user.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <ConfirmActionForm
                          action={handleDelete}
                          confirmMessage="Are you sure you want to delete this user?"
                          fields={{ id: user.id }}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </ConfirmActionForm>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

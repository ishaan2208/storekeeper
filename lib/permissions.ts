import type { Role } from "@/lib/auth";

export function canCreateSlip(role: Role): boolean {
  return role === "ADMIN" || role === "STORE_MANAGER";
}

export function canAdjustStock(role: Role): boolean {
  return role === "ADMIN" || role === "STORE_MANAGER";
}

export function canCloseMaintenance(role: Role): boolean {
  return role === "ADMIN" || role === "STORE_MANAGER" || role === "TECHNICIAN";
}

export function canManageMasters(role: Role): boolean {
  return role === "ADMIN" || role === "STORE_MANAGER";
}

export function canManageUsers(role: Role): boolean {
  return role === "ADMIN";
}

export function canApproveDamage(role: Role): boolean {
  return role === "ADMIN";
}

export function assertPermission(ok: boolean, message = "Forbidden."): void {
  if (!ok) {
    throw new Error(message);
  }
}


export type UserRole = "client" | "admin" | "super_admin";
export type AccountStatus = "pending" | "approved" | "rejected" | "disabled";

export function isStaffRole(role: UserRole | string | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdmin(role: UserRole | string | undefined): boolean {
  return role === "super_admin";
}

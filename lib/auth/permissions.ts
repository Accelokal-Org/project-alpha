export const roles = ["APP_MANAGER", "SCHOOL_HEAD", "TEACHER", "ADVISER", "STUDENT"] as const;
export type Role = (typeof roles)[number];
export type Membership = { school_id: string; user_id: string; role: Role };
export function isAppManager(memberships: Membership[]) {
  return memberships.some(m => m.role === "APP_MANAGER");
}
export type Permission = "roster.read" | "student.read_own";
const permissions: Record<Role, readonly Permission[]> = {
  APP_MANAGER: ["roster.read"], SCHOOL_HEAD: ["roster.read"],
  TEACHER: ["roster.read"], ADVISER: ["roster.read"], STUDENT: ["student.read_own"],
};
export function hasPermission(memberships: Membership[], schoolId: string, permission: Permission) {
  return memberships.some(m => (m.school_id === schoolId || m.role === "APP_MANAGER") && permissions[m.role].includes(permission));
}
export function isStaff(memberships: Membership[]) {
  return memberships.some(m => permissions[m.role].includes("roster.read"));
}
export function canReadClassRoster(memberships: Membership[], schoolId: string, isAssignedAdviser: boolean) {
  return memberships.some(m => m.role === "APP_MANAGER" || (m.school_id === schoolId &&
    (m.role === "SCHOOL_HEAD" || (m.role === "ADVISER" && isAssignedAdviser))));
}

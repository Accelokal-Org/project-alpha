import type { Assignment, RosterStudent } from "./types";
// Public, fictional fixtures only. No imports from authenticated data access.
export const previewAssignments: Assignment[] = [
 { id: "mat-acacia", classId: "acacia", schoolId: "demo", school: "Mabini Community High School", year: "2026–2027", className: "Grade 8 · Acacia", subject: "Mathematics", code: "MAT", kind: "Subject" },
 { id: "sci-narra", classId: "narra", schoolId: "demo", school: "Mabini Community High School", year: "2026–2027", className: "Grade 8 · Narra", subject: "Science", code: "SCI", kind: "Subject" },
 { id: "advisory-acacia", classId: "acacia", schoolId: "demo", school: "Mabini Community High School", year: "2026–2027", className: "Grade 8 · Acacia", subject: "Class advisory", code: "ADV", kind: "Advisory" },
];
const names = ["Alonzo, Sofia", "Bautista, Miguel", "Cruz, Isabella", "Dela Rosa, Gabriel", "Garcia, Amara", "Lim, Rafael", "Mendoza, Chloe", "Navarro, Lucas", "Ramos, Elena", "Reyes, Mateo", "Santos, Lucia", "Villanueva, Noah"];
export function previewRoster(classId: string): RosterStudent[] {
 return names.map((name, i) => ({ id: `demo-${i + 1}`, name, studentCode: `STU-2026-${String(i + 1).padStart(4, "0")}` })).filter((_, i) => classId === "acacia" ? i < 6 : i >= 6);
}

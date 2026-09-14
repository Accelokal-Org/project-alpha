import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
export default async function Student() {
 const { client, user, memberships } = await requireSession();
 const schoolIds = memberships.filter(m => hasPermission(memberships,m.school_id,"student.read_own")).map(m => m.school_id);
 if (!schoolIds.length) return <AppShell student><h1 className="text-xl font-semibold">School access not assigned</h1><p className="mt-3 text-muted">Ask your school administrator to connect your account to a school role.</p></AppShell>;
 const { data: students, error } = await client.from("students").select("id,display_name,student_code").eq("user_id",user.id).in("school_id",schoolIds);
 if (error) throw new Error("Could not load your school profile.");
 const { data: enrollments, error: enrollmentError } = students.length ? await client.from("class_enrollments").select("class_id").in("student_id",students.map(s => s.id)) : { data: [], error: null };
 if (enrollmentError) throw new Error("Could not load your class.");
 const { data: classes, error: classError } = enrollments.length ? await client.from("classes").select("id,name").in("id",enrollments.map(e => e.class_id)) : { data: [], error: null };
 if (classError) throw new Error("Could not load your class.");
 return <AppShell student><p className="text-xs text-muted mb-2">Student portal</p><h1 className="text-2xl font-semibold text-navy">My school</h1>{students.length ? students.map(s => <section key={s.id} className="bg-white border border-border rounded-lg p-6 mt-6"><h2 className="font-semibold">{s.display_name}</h2><p className="text-xs text-muted mt-1">{s.student_code}</p><p className="mt-5">{classes.map(c => c.name).join(" · ") || "No class assigned yet"}</p></section>) : <p className="mt-6 text-muted">Your student profile has not been linked yet. Contact your school administrator.</p>}<p className="text-sm text-muted mt-6">Published scores, attendance, and released report cards will become available in later releases.</p></AppShell>;
}

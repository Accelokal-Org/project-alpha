// Generated from versioned migrations by scripts/generate-foundation-types.mjs.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type SchoolRole = "APP_MANAGER" | "SCHOOL_HEAD" | "TEACHER" | "ADVISER" | "STUDENT";
type Table<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };
export type Database = { public: { Tables: {
admin_audit_log: Table<{
id: string;
actor_id: string | null;
school_id: string | null;
action: string;
entity_id: string | null;
before_value: Json | null;
after_value: Json | null;
created_at: string;
}>;
assessment_events: Table<{
id: string;
assessment_id: string;
actor_id: string | null;
action: string;
details: Json;
created_at: string;
}>;
assessment_scores: Table<{
assessment_id: string;
school_id: string;
offering_id: string;
student_id: string;
score: number;
}>;
assessments: Table<{
id: string;
school_id: string;
offering_id: string;
title: string;
assessment_date: string;
max_score: number;
published_at: string | null;
version: number;
created_by: string | null;
created_at: string;
}>;
attendance_days: Table<{
id: string;
school_id: string;
offering_id: string;
attendance_date: string;
version: number;
updated_at: string;
}>;
attendance_events: Table<{
id: string;
day_id: string;
actor_id: string | null;
reason: string;
before_value: Json;
after_value: Json;
created_at: string;
}>;
attendance_records: Table<{
day_id: string;
school_id: string;
offering_id: string;
student_id: string;
status_code: string;
status_label: string;
}>;
attendance_statuses: Table<{
school_id: string;
code: string;
label: string;
active: boolean;
}>;
class_enrollments: Table<{
school_id: string;
class_id: string;
student_id: string;
}>;
classes: Table<{
id: string;
school_id: string;
school_year_id: string;
grade_level_id: string;
name: string;
adviser_teacher_id: string | null;
}>;
grade_levels: Table<{
id: string;
school_id: string;
name: string;
sort_order: number;
}>;
lesson_plan_events: Table<{
id: string;
plan_id: string;
actor_id: string | null;
before_value: Json | null;
after_value: Json;
created_at: string;
}>;
lesson_plans: Table<{
id: string;
school_id: string;
offering_id: string;
title: string;
objectives: string;
activities: string;
resources: string;
lesson_date: string | null;
is_template: boolean;
version: number;
created_by: string | null;
created_at: string;
updated_at: string;
}>;
platform_admins: Table<{
user_id: string;
created_at: string;
}>;
school_memberships: Table<{
school_id: string;
user_id: string;
role: SchoolRole;
}>;
school_years: Table<{
id: string;
school_id: string;
name: string;
starts_on: string;
ends_on: string;
is_active: boolean;
}>;
schools: Table<{
id: string;
name: string;
timezone: string;
created_at: string;
}>;
students: Table<{
id: string;
school_id: string;
user_id: string | null;
student_code: string;
display_name: string;
created_at: string;
}>;
subject_enrollments: Table<{
school_id: string;
offering_id: string;
student_id: string;
}>;
subject_offerings: Table<{
id: string;
school_id: string;
class_id: string;
subject_id: string;
}>;
subjects: Table<{
id: string;
school_id: string;
code: string;
name: string;
}>;
teacher_assignments: Table<{
school_id: string;
offering_id: string;
teacher_id: string;
}>;
teachers: Table<{
id: string;
school_id: string;
user_id: string | null;
employee_code: string;
display_name: string;
}>;
}; Views: Record<never, never>; Functions: {
can_manage_lessons: { Args: { offering: string }; Returns: boolean };
save_lesson_plan: { Args: { offering: string; target: string | null; expected_version: number; title: string; objectives: string; activities: string; resources: string; lesson_date: string | null; is_template: boolean }; Returns: string };
my_upcoming_lessons: { Args: Record<never, never>; Returns: Database["public"]["Tables"]["lesson_plans"]["Row"][] };
staff_offerings: { Args: Record<never, never>; Returns: Database["public"]["Tables"]["subject_offerings"]["Row"][] };
is_app_manager: { Args: Record<never, never>; Returns: boolean };
admin_setup: { Args: { operation: string; payload: Json }; Returns: Json };
can_manage_assessments: { Args: { offering: string }; Returns: boolean };
create_assessment: { Args: { offering: string; title: string; assessment_date: string; max_score: number }; Returns: string };
save_assessment_scores: { Args: { target: string; expected_version: number; entries: Json }; Returns: undefined };
publish_assessment: { Args: { target: string; expected_version: number }; Returns: undefined };
my_published_scores: { Args: Record<never, never>; Returns: { assessment_id: string; title: string; assessment_date: string; subject: string; class_name: string; school: string; score: number; max_score: number; published_at: string }[] };
can_manage_attendance: { Args: { offering: string }; Returns: boolean };
configure_attendance_status: { Args: { target_school: string; status_code: string; status_label: string; enabled: boolean }; Returns: undefined };
save_attendance: { Args: { offering: string; day: string; expected_version: number; entries: Json; reason: string }; Returns: undefined };
my_attendance: { Args: Record<never, never>; Returns: { day_id: string; attendance_date: string; subject: string; class_name: string; school: string; status: string }[] };
admin_accounts: { Args: { target_school: string }; Returns: { user_id: string; email: string; role: SchoolRole }[] };
admin_invite_access: { Args: { target_school: string; account_email: string; account_roles: SchoolRole[]; profile?: string; invited_user?: string }; Returns: undefined };
}; Enums: { school_role: SchoolRole }; CompositeTypes: Record<never, never> } };

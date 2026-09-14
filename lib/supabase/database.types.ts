// Generated from the foundation migration by scripts/generate-foundation-types.mjs.
export type SchoolRole = "APP_MANAGER" | "SCHOOL_HEAD" | "TEACHER" | "ADVISER" | "STUDENT";
type Table<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };
export type Database = { public: { Tables: {
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
}; Views: Record<never, never>; Functions: { staff_offerings: { Args: Record<never, never>; Returns: Database["public"]["Tables"]["subject_offerings"]["Row"][] } }; Enums: { school_role: SchoolRole }; CompositeTypes: Record<never, never> } };

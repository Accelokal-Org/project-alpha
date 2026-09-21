import {
  BookOpen, CalendarCheck, ChartColumn, ClipboardList, GraduationCap,
  History, Layers, LayoutDashboard, PlusCircle, School, ShieldCheck,
  SlidersHorizontal, Users, UserRound,
} from "lucide-react";

const sectionIcons = {
  overview: LayoutDashboard, structure: Layers, people: Users,
  subjects: BookOpen, assignments: ClipboardList, accounts: UserRound,
  attendance: CalendarCheck, grading: SlidersHorizontal,
  completion: ChartColumn, audit: History,
};

export function NavigationIcon({ href }: { href: string }) {
  const url = new URL(href, "https://deskonekt.invalid");
  const section = url.searchParams.get("tab") ?? url.searchParams.get("view");
  const SectionIcon = sectionIcons[section as keyof typeof sectionIcons];
  const Icon = url.pathname === "/deskonekt/admin/setup" ? PlusCircle
    : url.pathname === "/student" ? GraduationCap
    : url.pathname.startsWith("/teacher/classes/") || section === "classes" ? BookOpen
    : SectionIcon ?? (url.pathname === "/deskonekt/admin"
      ? url.searchParams.has("school") ? School : ShieldCheck
      : LayoutDashboard);
  return <Icon size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />;
}

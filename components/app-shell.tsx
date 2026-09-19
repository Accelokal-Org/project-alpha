import { SubmitButton } from "@/components/ui/submit-button";
import Link from "@/components/ui/navigation-link";
import Image from "next/image";
import { LayoutDashboard, Users, ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { logout } from "@/app/login/actions";
import { brand } from "@/lib/brand";
export function AppShell({ children, active = "workspace", name = "School account", student = false, adminAccess = false }: {
 children: React.ReactNode; active?: "workspace" | "classes"; name?: string; student?: boolean; adminAccess?: boolean;
}) {
 const base = student ? "/student" : "/teacher";
 return <div className="min-h-screen">
  <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-3">Skip to workspace</a>
  <header className="h-16 bg-white border-b border-border flex items-center justify-between px-5 lg:px-7 gap-4">
   <Link href={base} className="flex shrink-0 items-center gap-2.5 text-navy font-semibold text-xl tracking-tight"><Image src="/brand/deskonekt-icon-light-transparent.png" alt="" width={404} height={394} className="h-10 w-auto shrink-0" sizes="42px" /><span className="flex flex-col leading-tight">{brand.name}<span className="text-[10px] font-normal tracking-normal text-muted mt-0.5">{brand.byline}</span></span></Link>
   <div className="flex items-center gap-4"><span className="hidden sm:flex items-center gap-2 text-xs text-muted"><ShieldCheck size={15} /> School workspace</span><div className="h-7 border-l border-border" /><span className="h-8 w-8 bg-[#ece7fa] rounded-full flex items-center justify-center text-primary font-semibold text-xs">{name.split(/\s+/).map(part => part[0]).slice(0,2).join("").toUpperCase()}</span><span className="hidden md:block text-sm">{name}</span></div>
  </header>
  <div className="md:grid md:grid-cols-[218px_minmax(0,1fr)] min-h-[calc(100vh-64px)]">
   <aside className="bg-white border-b md:border-b-0 md:border-r border-border flex flex-col">
    <div className="hidden md:block px-5 py-6"><p className="text-[10px] text-muted uppercase tracking-widest font-semibold">Academic workspace</p><div className="flex items-center gap-3 mt-2 text-navy font-semibold">{student ? "Student portal" : "Teacher workspace"}<ChevronDown size={14} /></div></div>
    <nav aria-label="Main navigation" className="flex md:block p-3 md:pt-0 gap-2 space-y-0 md:space-y-1">
     <Link href={base} aria-current={active === "workspace" ? "page" : undefined} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm ${active === "workspace" ? "bg-[#f0ebff] text-primary font-semibold" : "text-muted hover:bg-slate-50"}`}><LayoutDashboard size={17} />{student ? "My school" : "My workspace"}</Link>
     {!student && <Link href={`${base}?view=classes`} aria-current={active === "classes" ? "page" : undefined} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm ${active === "classes" ? "bg-[#f0ebff] text-primary font-semibold" : "text-muted hover:bg-slate-50"}`}><Users size={17} />My classes</Link>}
    {adminAccess && <Link href="/deskonekt/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted hover:bg-slate-50"><ShieldCheck size={17} />Administration</Link>}
    </nav>
    <div className="hidden md:block mt-auto p-5 border-t border-border"><p className="text-[11px] uppercase tracking-wider text-muted mb-2">Signed-in account</p><form action={logout}><SubmitButton variant="ghost" pendingLabel="Signing out…"><LogOut size={15} /> Sign out</SubmitButton></form></div>
   </aside>
   <div className="min-w-0">
    <main id="main" className="p-5 lg:px-9 lg:py-8 max-w-[1440px] mx-auto">{children}</main>
    <form action={logout} className="md:hidden p-5"><SubmitButton variant="ghost" pendingLabel="Signing out…">Sign out</SubmitButton></form>
   </div>
  </div>
 </div>;
}

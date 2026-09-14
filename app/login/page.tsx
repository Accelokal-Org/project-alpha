import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export default function Login() {
 const configured = isSupabaseConfigured();
 return <main className="min-h-screen grid lg:grid-cols-[1fr_1.15fr]">
  <section className="bg-navy text-white px-8 py-12 lg:p-16 flex flex-col justify-between gap-16">
   <Link href="/login" className="flex items-center gap-3 text-xl font-semibold tracking-tight"><BookOpen size={25} className="text-cyan-300" /> EduArchive</Link>
   <div className="max-w-md"><p className="text-cyan-300 text-xs font-semibold tracking-[.16em] uppercase mb-5">School academic records</p><h1 className="text-3xl lg:text-4xl font-semibold leading-tight">Your classes.<br />Your records.<br />One place to work.</h1><p className="text-slate-300 leading-relaxed mt-6">A practical workspace for teachers, advisers, and school heads. Built around the school day.</p><div className="h-px bg-white/15 my-8" /><p className="text-sm text-slate-300 flex gap-3 items-center"><ShieldCheck size={18} className="text-cyan-300 shrink-0" /> Access is scoped to your school and assignments.</p></div>
   <p className="text-xs text-slate-400">Academic records, thoughtfully organized.</p>
  </section>
  <section className="flex items-center justify-center p-8 py-16"><div className="w-full max-w-sm">
   <p className="text-xs uppercase tracking-widest text-muted font-semibold mb-3">Welcome back</p><h2 className="text-2xl font-semibold mb-2">Sign in to your school</h2><p className="text-muted mb-8 leading-relaxed">Use the account provided by your school administrator.</p>
   {!configured && <p className="border border-amber-200 bg-amber-50 rounded-md p-3 text-sm text-amber-900 mb-6">School sign-in is awaiting setup. The sample workspace is available to explore.</p>}
   <LoginForm configured={configured} />
   <p className="text-xs text-muted mt-5">Need access or a password reset? Contact your school administrator.</p>
   <div className="border-t border-border mt-8 pt-6"><Link href="/preview" className="flex items-center justify-between font-medium text-primary">Explore the sample workspace <ArrowRight size={17} /></Link><p className="text-xs text-muted mt-2">Fictional school data. No sign-in required.</p></div>
  </div></section>
 </main>;
}

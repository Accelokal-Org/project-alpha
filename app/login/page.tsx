import Link from "@/components/ui/navigation-link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { brand } from "@/lib/brand";
import { schoolDestination } from "@/lib/auth/destination";
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
 const destination = schoolDestination((await searchParams).next);
 const configured = isSupabaseConfigured();
 return <main className="min-h-screen grid lg:grid-cols-[1fr_1.15fr]">
  <section className="bg-navy text-white px-8 py-12 lg:p-16 flex flex-col justify-between gap-16">
   <Link href="/login" className="flex items-center gap-3 text-xl font-semibold tracking-tight"><Image src="/brand/deskonekt-icon-dark-transparent.png" alt="" width={398} height={390} className="h-14 w-auto shrink-0" sizes="58px" /> {brand.name}</Link>
   <div className="max-w-md"><p className="text-cyan-300 text-xs font-semibold tracking-[.16em] uppercase mb-5">Academic workspace</p><h1 className="text-3xl lg:text-4xl font-semibold leading-tight max-w-sm">{brand.tagline}</h1><p className="text-sm text-cyan-300 mt-4">{brand.byline}</p><p className="text-slate-300 leading-relaxed mt-6">A seamless academic workspace built around the teacher.</p><div className="h-px bg-white/15 my-8" /><p className="text-sm text-slate-300 flex gap-3 items-center"><ShieldCheck size={18} className="text-cyan-300 shrink-0" /> Access is scoped to your school and assignments.</p></div>
   <p className="text-xs text-slate-400">Built around your day-to-day academic work.</p>
  </section>
  <section className="flex items-center justify-center p-8 py-16"><div className="w-full max-w-sm">
   <p className="text-xs uppercase tracking-widest text-muted font-semibold mb-3">Welcome back</p><h2 className="text-2xl font-semibold mb-2">Sign in to your school</h2><p className="text-muted mb-8 leading-relaxed">Use the account provided by your school administrator.</p>
   {!configured && <p className="border border-amber-200 bg-amber-50 rounded-md p-3 text-sm text-amber-900 mb-6">School sign-in is awaiting setup. Contact your school administrator.</p>}
   <LoginForm configured={configured} destination={destination} />
   <p className="text-xs text-muted mt-5">Need access or a password reset? Contact your school administrator.</p>
  </div></section>
 </main>;
}

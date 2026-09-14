import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { brand } from "@/lib/brand";
export const dynamic = "force-dynamic";
export const metadata = {title:"Superadmin sign-in",robots:{index:false,follow:false}};
export default function AdminLogin() {
 const configured = isSupabaseConfigured();
 return <main className="min-h-screen grid place-items-center p-6"><section className="w-full max-w-md bg-white rounded-lg border border-border p-7 sm:p-9">
  <div className="flex items-center gap-3 mb-8"><Image src="/brand/deskonekt-icon-light.png" width={404} height={394} alt="" className="w-12 h-auto" sizes="48px" /><div><p className="font-semibold text-xl text-navy">{brand.name}</p><p className="text-xs text-muted">{brand.byline}</p></div></div>
  <h1 className="text-2xl font-semibold text-navy">Superadmin sign-in</h1><p className="text-muted text-sm mt-2 mb-6">Manage schools, accounts, and your Deskonekt setup.</p>
  {!configured && <p role="status" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 mb-5">Connect Supabase and provision your first superadmin account to enable sign-in. Setup instructions are in the project’s admin guide.</p>}
  <LoginForm configured={configured} admin />
  <p className="text-xs text-muted mt-5">Restricted to platform administrators. Teacher and student accounts cannot access this area.</p>
  <Link href="/login" className="inline-block mt-6 text-sm text-primary">Return to school sign-in</Link>
 </section></main>;
}

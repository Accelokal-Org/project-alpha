import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isAppManager } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
export async function requireAdmin() {
 if (!isSupabaseConfigured()) redirect("/deskonekt/admin/login");
 const client = await createClient();
 const { data, error } = await client.auth.getUser();
 if (error || !data.user) redirect("/deskonekt/admin/login");
 const session = await requireSession();
 if (!isAppManager(session.memberships)) notFound();
 return session;
}

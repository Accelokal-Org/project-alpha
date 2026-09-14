import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
export const requireSession = cache(async () => {
  if (!isSupabaseConfigured()) redirect("/login?setup=required");
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login");
  const { data: memberships, error: membershipError } = await client.from("school_memberships")
    .select("school_id,user_id,role").eq("user_id", data.user.id);
  if (membershipError) throw new Error("Could not load school access. Please try again.");
  return { client, user: data.user, memberships: memberships ?? [] };
});

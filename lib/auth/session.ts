import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Membership } from "./permissions";
export const requireSession = cache(async () => {
  if (!isSupabaseConfigured()) redirect("/login?setup=required");
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login");
  const { data: memberships, error: membershipError } = await client.from("school_memberships")
    .select("school_id,user_id,role").eq("user_id", data.user.id);
  if (membershipError) throw new Error("Could not load school access. Please try again.");
  const { data: platformAdmin, error: adminError } = await client.from("platform_admins").select("user_id").eq("user_id",data.user.id).maybeSingle();
  if (adminError) throw new Error("Could not load account access. Please try again.");
  const access: Membership[] = memberships ?? [];
  // Platform scope has no school FK; normalize it only in the application permission DTO.
  if (platformAdmin && !access.some(m => m.role === "APP_MANAGER")) access.push({school_id:"*",user_id:data.user.id,role:"APP_MANAGER"});
  return { client, user: data.user, memberships: access };
});

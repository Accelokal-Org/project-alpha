"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "./access";
import { setupSchema, type AdminFormState } from "./schema";
const resultSchema = z.object({school_id:z.uuid()});
export async function saveSetup(_state: AdminFormState, form: FormData): Promise<AdminFormState> {
 const { client } = await requireAdmin();
 const input = Object.fromEntries(form.entries());
 const parsed = setupSchema.safeParse({...input,is_active:form.get("is_active")==="on"});
 if (!parsed.success) return {error:parsed.error.issues[0]?.message ?? "Check the form fields."};
 const {operation,...payload} = parsed.data;
 const {data,error} = await client.rpc("admin_setup",{operation,payload});
 if (error) {
  const messages: Record<string,string> = {
   "23505":"This record already exists, or another school year is already active.",
   "23503":"Choose records from the selected school.",
   "42501":"Superadmin access is required. Sign in again.",
   "P0002":"The selected record or login account could not be found.",
   "22023":"Check your entries. A profile already linked to another account cannot be reassigned here.",
   "23514":"Check the dates and required fields.",
  };
  return {error:messages[error.code] ?? "The change could not be saved. Please try again."};
 }
 revalidatePath("/deskonekt/admin"); revalidatePath("/teacher"); revalidatePath("/student");
 if (operation === "create_school" || operation === "create_test_school") {
  const result = resultSchema.safeParse(data);
  if (!result.success) return {error:"School saved, but the page could not be opened. Refresh the school list."};
  redirect(`/deskonekt/admin?school=${result.data.school_id}`);
 }
 return {success:"Saved successfully."};
}

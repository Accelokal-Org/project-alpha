"use client";
import { useActionState, useId } from "react";
import { saveSetup } from "@/features/admin/actions";
import type { SetupOperation } from "@/features/admin/schema";
import { Button } from "@/components/ui/button";
export type FormField = {name:string;label:string;type?:"text"|"date"|"email"|"checkbox";value?:string;options?:{value:string;label:string}[];optional?:boolean;hint?:string};
export function SetupForm({operation,schoolId,title,description,fields,submit="Save",disabled=false}:{
 operation:SetupOperation;schoolId?:string;title:string;description?:string;fields:FormField[];submit?:string;disabled?:boolean;
}) {
 const [state,action,pending] = useActionState(saveSetup,{}); const prefix=useId();
 return <section className="border border-border bg-white rounded-lg p-5"><h2 className="font-semibold text-navy">{title}</h2>{description && <p className="text-xs text-muted mt-1 mb-4 leading-relaxed">{description}</p>}
  <form action={action} className="space-y-3 mt-4">
   <input type="hidden" name="operation" value={operation} />{schoolId && <input type="hidden" name="school_id" value={schoolId} />}
   {fields.map(field=><div key={field.name}><label htmlFor={`${prefix}-${field.name}`}>{field.label}</label>{field.options ? <select id={`${prefix}-${field.name}`} name={field.name} className="w-full" required={!field.optional} defaultValue={field.value ?? ""}>
    <option value="">{field.optional ? "None" : "Choose…"}</option>{field.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
   </select> : <input id={`${prefix}-${field.name}`} name={field.name} type={field.type ?? "text"} defaultValue={field.type!=="checkbox" ? field.value : undefined} defaultChecked={field.type==="checkbox" && field.value==="true"} required={field.type!=="checkbox" && !field.optional} maxLength={field.name==="code" ? 50 : field.type==="email" ? 254 : 200} />}{field.hint && <p className="text-xs text-muted mt-1">{field.hint}</p>}</div>)}
   {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="text-sm text-teal-800">{state.success}</p>}
   <Button type="submit" disabled={pending||disabled}>{pending ? "Saving…" : submit}</Button>
  </form>
 </section>;
}

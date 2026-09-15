"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
export function SchoolSwitcher({schools,selected}:{schools:{id:string;name:string}[];selected:string}) {
 const router=useRouter();const [pending,startTransition]=useTransition();
 return <form aria-busy={pending} className="flex flex-wrap gap-3 items-end flex-1" onSubmit={event=>{event.preventDefault();const id=new FormData(event.currentTarget).get("school");if(typeof id!=="string"||id===selected)return;startTransition(()=>router.push(`/deskonekt/admin?school=${encodeURIComponent(id)}`));}}><div className="flex-1 max-w-md"><label htmlFor="school">School</label><select key={selected} id="school" name="school" defaultValue={selected} disabled={pending} className="w-full">{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><Button variant="outline" type="submit" disabled={pending}>{pending&&<Spinner/>}{pending?"Opening school…":"Open school"}</Button><span role="status" className="sr-only">{pending?"Loading selected school…":""}</span></form>;
}

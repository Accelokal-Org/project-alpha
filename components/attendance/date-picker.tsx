"use client";
import {useTransition} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Spinner} from "@/components/ui/feedback";
export function AttendanceDatePicker({offering,date,today}:{offering:string;date:string;today:string}){
 const router=useRouter();const [pending,start]=useTransition();
 return <form className="flex flex-wrap items-end gap-3" aria-busy={pending} onSubmit={e=>{e.preventDefault();const day=new FormData(e.currentTarget).get("date");if(typeof day==="string"&&day!==date)start(()=>router.push(`/teacher/classes/${offering}?tab=attendance&date=${encodeURIComponent(day)}`));}}><div><label htmlFor="attendance-date">Attendance date</label><input key={date} id="attendance-date" name="date" type="date" defaultValue={date} max={today} required disabled={pending}/></div><Button disabled={pending} type="submit">{pending&&<Spinner/>}{pending?"Opening date…":"Open date"}</Button></form>;
}

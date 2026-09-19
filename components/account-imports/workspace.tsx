import {notFound} from "next/navigation";
import {z} from "zod";
import Link from "@/components/ui/navigation-link";
import {requireSession} from "@/lib/auth/session";
import {isAppManager} from "@/lib/auth/permissions";
import {AccountImportForm} from "./import-form";
import {ImportDelivery} from "./delivery";
export async function SchoolAccounts({school,batch}:{school?:string;batch?:string}){
 const {client,memberships}=await requireSession();const manager=isAppManager(memberships),ids=memberships.filter(m=>m.role==="SCHOOL_HEAD").map(m=>m.school_id);
 if(!manager&&!ids.length)notFound();
 let q=client.from("schools").select("id,name").order("name").limit(200);if(!manager)q=q.in("id",ids);
 const {data:schools,error}=await q;if(error)throw new Error("Could not load schools.");
 if(school&&!schools.some(s=>s.id===school))notFound();if(batch&&!z.uuid().safeParse(batch).success)notFound();
 let rows:Awaited<ReturnType<typeof getRows>>=[];
 if(school)rows=await getRows();
 if(batch&&(!school||!rows.length))notFound();
 async function getRows(){let q=client.from("school_account_imports").select("id,username,first_name,last_name,email,role,status,batch_id,created_at").eq("school_id",school!).order("created_at",{ascending:false}).order("id").limit(batch?100:1000);if(batch)q=q.eq("batch_id",batch);const {data,error}=await q;if(error)throw new Error("Could not load account imports. Check that the account-import migration is installed.");return data;}
 const batches=[...new Set(rows.map(r=>r.batch_id))];
 return <div className="space-y-5"><Link href="/teacher" className="text-primary text-sm">Back to teacher workspace</Link><h1 className="text-2xl font-semibold">School accounts</h1><nav aria-label="Choose school for accounts" className="flex gap-4 flex-wrap">{schools.map(s=><Link className="text-primary" key={s.id} href={`/teacher?view=accounts&school=${s.id}`} aria-current={s.id===school?"page":undefined}>{s.name}</Link>)}</nav>{school?<><AccountImportForm key={school} school={school}/><h2 className="font-semibold">{batch?"Selected import":"Recent imports"}</h2><nav className="flex gap-4 flex-wrap" aria-label="Account import batches">{batch&&<Link className="text-primary" href={`/teacher?view=accounts&school=${school}`}>All recent imports</Link>}{batches.map((b,i)=><Link key={b} className="text-primary text-sm" href={`/teacher?view=accounts&school=${school}&batch=${b}`}>Import {new Date(rows.find(r=>r.batch_id===b)!.created_at).toISOString().replace("T"," ").slice(0,19)} UTC · {i+1}</Link>)}</nav>{batch?<ImportDelivery key={batch} rows={rows}/>:<p className="text-sm text-muted">Choose an import to send invitations or review progress. Showing batches from the latest 1,000 imported users. {rows.length===0&&"No imports yet."}</p>}</>:<p>Choose a school to import users.</p>}</div>;
}

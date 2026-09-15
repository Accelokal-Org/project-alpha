import Link from "@/components/ui/navigation-link";
import {getLessons} from "@/features/lessons/queries";
import {LessonEditor} from "./editor";
export async function LessonWorkspace({offering,schoolId,query}:{offering:string;schoolId:string;query:{plan?:string;source?:string;new?:string;template?:string;saved?:string}}){
 const data=await getLessons(offering,schoolId,query.plan,query.source);
 const base=`/teacher/classes/${offering}?tab=lessons`;
 const editing=!!data.selected||query.new==="1"||!!data.source;
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-navy">Lesson plans</h2><p className="text-sm text-muted mt-1">Plan your lessons and reuse your teaching materials.</p></div>{data.canManage&&<div className="flex gap-4 text-sm text-primary"><Link href={`${base}&new=1`}>New lesson plan</Link><Link href={`${base}&new=1&template=1`}>New template</Link></div>}</div>
  {editing&&<><Link className="text-sm text-primary inline-block" href={base}>Back to lesson plans</Link><LessonEditor key={`${offering}-${data.selected?.id??"new"}-${data.source?.id??"blank"}-${query.template??"0"}`} offering={offering} plan={data.selected} source={data.source} template={query.template==="1"} canManage={data.canManage} saved={query.saved==="1"}/>{data.selected&&data.canManage&&<div className="flex gap-4 text-sm text-primary"><Link href={`${base}&source=${data.selected.id}&new=1`}>Copy into a new lesson</Link><Link href={`${base}&source=${data.selected.id}&new=1&template=1`}>Copy as a template</Link></div>}</>}
  {!editing&&<>
   <div className="overflow-x-auto rounded-lg border border-border bg-white"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-muted"><tr><th className="p-3">Title</th><th className="p-3">Lesson date</th><th className="p-3">Type</th></tr></thead><tbody>{data.list.map(plan=><tr key={plan.id} className="border-t border-border"><td className="p-3"><Link className="text-primary" href={`${base}&plan=${plan.id}`}>{plan.title}</Link></td><td className="p-3">{plan.lesson_date??"—"}</td><td className="p-3">{plan.is_template?"Template":"Lesson plan"}</td></tr>)}{!data.list.length&&<tr><td colSpan={3} className="p-6 text-muted">No lesson plans yet.{data.canManage?" Create your first plan above.":" Your subject teacher has not added a plan yet."}</td></tr>}</tbody></table></div>
   <p className="text-xs text-muted">Showing up to 100 recently updated plans and templates for this subject.</p>
   {data.canManage&&<section className="border border-border rounded-lg bg-white p-5"><h3 className="font-semibold text-navy">Start from a template</h3><p className="text-sm text-muted mt-1">Available templates from subjects you can access in this school. Each copy is saved separately.</p><ul className="mt-3 divide-y divide-border">{data.templates.map(template=><li key={template.id} className="py-3"><Link className="text-sm text-primary" href={`${base}&new=1&source=${template.id}`}>{template.title}</Link></li>)}</ul>{!data.templates.length&&<p className="text-sm text-muted mt-3">No templates available yet.</p>}<p className="text-xs text-muted mt-3">Up to 100 templates, ordered by title.</p></section>}
  </>}
 </div>;
}

import Link from "@/components/ui/navigation-link";
import {getUpcomingLessons} from "@/features/lessons/queries";
import type {Assignment} from "@/features/classes/types";
export async function UpcomingLessons({assignments}:{assignments:Assignment[]}){
 const plans=await getUpcomingLessons();
 return <section className="mt-6 rounded-lg border border-border bg-white p-5"><h2 className="font-semibold text-navy">Upcoming lessons</h2><p className="text-sm text-muted mt-1">Your next 20 lessons, starting today in each school’s timezone.</p>
  {!plans.length?<p className="text-sm text-muted mt-4">No upcoming lessons. Open an assigned subject’s Lesson plans tab to add one.</p>:<ul className="divide-y divide-border mt-3">{plans.map(plan=>{const assignment=assignments.find(a=>a.id===plan.offering_id);return <li key={plan.id} className="py-3 flex flex-wrap gap-3 justify-between"><div><Link className="text-sm text-primary font-medium" href={`/teacher/classes/${plan.offering_id}?tab=lessons&plan=${plan.id}`}>{plan.title}</Link><p className="text-xs text-muted mt-1">{assignment?`${assignment.subject} · ${assignment.className} · ${assignment.school}`:"Assigned subject"}</p></div><time className="text-sm text-muted" dateTime={plan.lesson_date??undefined}>{plan.lesson_date}</time></li>;})}</ul>}
 </section>;
}

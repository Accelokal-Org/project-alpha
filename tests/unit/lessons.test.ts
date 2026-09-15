import {beforeEach,it,expect,vi} from "vitest";
import {lessonSchema} from "@/features/lessons/schema";
const {rpc,revalidatePath,redirect}=vi.hoisted(()=>({rpc:vi.fn(),revalidatePath:vi.fn(),redirect:vi.fn()}));
vi.mock("@/lib/auth/session",()=>({requireSession:vi.fn(async()=>({client:{rpc}}))}));
vi.mock("next/cache",()=>({revalidatePath}));
vi.mock("next/navigation",()=>({redirect}));
import {saveLesson} from "@/features/lessons/actions";
const offering="70000000-0000-4000-8000-000000000001";
const base={offering,target:null,expected_version:0,title:"Lesson",objectives:"",activities:"",resources:"",lesson_date:"2026-09-15",is_template:false};
function form(){const data=new FormData();Object.entries({offering,target:"",version:"0",title:"Lesson",objectives:"",activities:"",resources:"",lesson_date:"2026-09-15"}).forEach(([k,v])=>data.set(k,v));return data;}
beforeEach(()=>{vi.clearAllMocks();rpc.mockResolvedValue({data:offering,error:null});});
it("requires real dates for plans and no date for templates",()=>{
 expect(lessonSchema.safeParse(base).success).toBe(true);
 for(const lesson_date of [null,"2026-02-30","bad"])expect(lessonSchema.safeParse({...base,lesson_date}).success).toBe(false);
 expect(lessonSchema.safeParse({...base,is_template:true,lesson_date:null}).success).toBe(true);
 expect(lessonSchema.safeParse({...base,title:" ",objectives:"x".repeat(10001)}).success).toBe(false);
});
it("validates input before any mutation",async()=>{const data=form();data.set("title","");expect(await saveLesson({},data)).toHaveProperty("error");expect(rpc).not.toHaveBeenCalled();});
it("creates undated templates and redirects to the saved copy",async()=>{
 const data=form();data.set("is_template","on");await saveLesson({},data);
 expect(rpc).toHaveBeenCalledWith("save_lesson_plan",{...base,is_template:true,lesson_date:null});
 expect(redirect).toHaveBeenCalledWith(`/teacher/classes/${offering}?tab=lessons&plan=${offering}&saved=1`);
 expect(revalidatePath).toHaveBeenCalledWith("/teacher","layout");
});
it("keeps a stale edit intact and returns actionable feedback",async()=>{rpc.mockResolvedValue({error:{code:"40001"}});expect(await saveLesson({version:3},form())).toMatchObject({version:3,error:expect.stringContaining("Copy your unsaved work")});expect(redirect).not.toHaveBeenCalled();});

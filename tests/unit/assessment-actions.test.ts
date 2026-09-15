import {beforeEach,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),rpc:vi.fn()}));
vi.mock("@/lib/auth/session",()=>({requireSession:m.session}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("next/navigation",()=>({redirect:(path:string)=>{throw new Error(`REDIRECT:${path}`);}}));
import {saveScores,publishScores} from "@/features/assessments/actions";
const id="70000000-0000-4000-8000-000000000001";
function form(){const f=new FormData();f.set("target",id);f.set("version","2");return f;}
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({client:{rpc:m.rpc}});m.rpc.mockResolvedValue({error:null});});
it("saves blanks as null and zero as zero under the current session",async()=>{const f=form();f.set(`score:${id}`,"");f.set("score:80000000-0000-4000-8000-000000000001","0");expect((await saveScores({},f)).success).toContain("Draft scores saved");expect(m.rpc).toHaveBeenCalledWith("save_assessment_scores",{target:id,expected_version:2,entries:[{student_id:id,score:null},{student_id:"80000000-0000-4000-8000-000000000001",score:0}]});});
it("requires explicit publishing confirmation",async()=>{expect((await publishScores({},form())).error).toContain("Confirm");expect(m.rpc).not.toHaveBeenCalled();const f=form();f.set("confirmed","on");expect((await publishScores({},f)).success).toContain("published");});
it("shows a refresh instruction for concurrent edits",async()=>{m.rpc.mockResolvedValue({error:{code:"40001"}});const f=form();expect((await saveScores({},f)).error).toContain("Refresh");});
it("authenticates before accepting scores",async()=>{m.session.mockRejectedValue(new Error("Sign in"));await expect(saveScores({},form())).rejects.toThrow("Sign in");expect(m.rpc).not.toHaveBeenCalled();});

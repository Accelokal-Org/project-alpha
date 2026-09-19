import {beforeEach,it,expect,vi} from "vitest";
const {rpc,revalidatePath,redirect}=vi.hoisted(()=>({rpc:vi.fn(),revalidatePath:vi.fn(),redirect:vi.fn()}));
vi.mock("@/lib/auth/session",()=>({requireSession:vi.fn(async()=>({client:{rpc}}))}));
vi.mock("next/cache",()=>({revalidatePath}));
vi.mock("next/navigation",()=>({redirect}));
import {saveReport,approveReport} from "@/features/report-cards/actions";
const id="10000000-0000-4000-8000-000000000001",token="a".repeat(32);
function form(values:Record<string,string>){const f=new FormData();Object.entries(values).forEach(([k,v])=>f.set(k,v));return f;}
beforeEach(()=>{vi.clearAllMocks();rpc.mockResolvedValue({data:1,error:null});});
it("requires confirmation before saving and opens the saved version",async()=>{
 const values={class:id,student:id,version:"0",token};
 expect(await saveReport({},form(values))).toHaveProperty("error");expect(rpc).not.toHaveBeenCalled();
 await saveReport({},form({...values,confirmed:"on"}));expect(rpc).toHaveBeenCalledWith("save_report_card",{target_class:id,target_student:id,expected_version:0,expected_token:token});
 expect(redirect).toHaveBeenCalledWith(`/teacher/classes/advisory-${id}?tab=report-cards&student=${id}&report_version=1`);
});
it("checks approval confirmation and reports source conflicts without pretending success",async()=>{
 const values={target:id,version:"1",token};
 await approveReport({},form(values));expect(rpc).not.toHaveBeenCalled();
 rpc.mockResolvedValue({error:{code:"40001"}});
 expect(await approveReport({},form({...values,confirmed:"on"}))).toMatchObject({error:expect.stringContaining("source grades changed")});expect(revalidatePath).not.toHaveBeenCalled();
});

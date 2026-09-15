import {beforeEach,it,expect,vi} from "vitest";
const {rpc,revalidatePath}=vi.hoisted(()=>({rpc:vi.fn(),revalidatePath:vi.fn()}));
vi.mock("@/lib/auth/session",()=>({requireSession:vi.fn(async()=>({client:{rpc}}))}));
vi.mock("next/cache",()=>({revalidatePath}));
import {reviewGrades,resubmitGrades} from "@/features/grades/review-actions";
const id="10000000-0000-4000-8000-000000000001";
function form(values:Record<string,string>){const f=new FormData();Object.entries(values).forEach(([k,v])=>f.set(k,v));return f;}
beforeEach(()=>{vi.clearAllMocks();rpc.mockResolvedValue({error:null});});
it("requires a return reason and explicit review confirmation",async()=>{
 const values={target:id,version:"1",decision:"returned",reason:"",confirmed:"on"};
 expect(await reviewGrades({},form(values))).toHaveProperty("error");expect(rpc).not.toHaveBeenCalled();
 await reviewGrades({},form({...values,reason:"Verify totals"}));expect(rpc).toHaveBeenCalledWith("review_period_grades",{target:id,expected_version:1,decision:"returned",reason:"Verify totals"});
});
it("requires a correction note and forwards reviewed version and source token",async()=>{
 const values={target:id,version:"2",token:"a".repeat(32),reason:"Corrected quiz",confirmed:"on"};
 await resubmitGrades({},form({...values,reason:""}));expect(rpc).not.toHaveBeenCalled();
 await resubmitGrades({},form(values));expect(rpc).toHaveBeenCalledWith("resubmit_period_grades",{target:id,expected_version:2,expected_token:values.token,correction_note:"Corrected quiz"});
});
it("reports stale review without invalidating the displayed record",async()=>{
 rpc.mockResolvedValue({error:{code:"40001"}});
 expect(await reviewGrades({},form({target:id,version:"1",decision:"reviewed",reason:"",confirmed:"on"}))).toMatchObject({error:expect.stringContaining("Refresh")});expect(revalidatePath).not.toHaveBeenCalled();
});

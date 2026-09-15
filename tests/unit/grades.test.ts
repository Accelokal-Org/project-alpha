import {beforeEach,it,expect,vi} from "vitest";
import {calculationSchema,submissionSchema} from "@/features/grades/schema";
const {rpc,revalidatePath}=vi.hoisted(()=>({rpc:vi.fn(),revalidatePath:vi.fn()}));
vi.mock("@/lib/auth/session",()=>({requireSession:vi.fn(async()=>({client:{rpc}}))}));
vi.mock("next/cache",()=>({revalidatePath}));
import {approveCalculation,submitGrades} from "@/features/grades/actions";
const id="10000000-0000-4000-8000-000000000001",token="a".repeat(32);
function form(values:Record<string,string>){const f=new FormData();Object.entries(values).forEach(([k,v])=>f.set(k,v));return f;}
beforeEach(()=>{vi.clearAllMocks();rpc.mockResolvedValue({data:id,error:null});});
it("requires school-selected settings rather than an automatic rule",async()=>{
 expect(calculationSchema.safeParse({scheme:id,confirmed:"on"}).success).toBe(false);
 expect(await approveCalculation({},form({scheme:id,method:"total_points",missing_scores:"block",confirmed:"on"}))).toHaveProperty("error");
 expect(rpc).not.toHaveBeenCalled();
 await approveCalculation({},form({scheme:id,method:"average_percentages",missing_scores:"zero",decimal_places:"0",confirmed:"on"}));
 expect(rpc).toHaveBeenCalledWith("approve_grade_calculation",{scheme:id,method:"average_percentages",missing_scores:"zero",decimal_places:0});
});
it("rejects unknown algorithms and unsupported rounding",()=>{
 for(const method of ["", "custom-script"]){expect(calculationSchema.safeParse({scheme:id,method,missing_scores:"zero",decimal_places:2,confirmed:"on"}).success).toBe(false);}
 expect(calculationSchema.safeParse({scheme:id,method:"total_points",missing_scores:"block",decimal_places:3,confirmed:"on"}).success).toBe(false);
});
it("requires review confirmation and a valid input token",async()=>{
 expect(submissionSchema.safeParse({offering:id,period:id,expected_token:token}).success).toBe(false);
 await submitGrades({},form({offering:id,period:id,token,confirmed:"off"}));expect(rpc).not.toHaveBeenCalled();
 await submitGrades({},form({offering:id,period:id,token,confirmed:"on"}));
 expect(rpc).toHaveBeenCalledWith("submit_period_grades",{offering:id,period:id,expected_token:token});
});
it("reports stale inputs without silently submitting a newer calculation",async()=>{
 rpc.mockResolvedValue({error:{code:"40001"}});
 expect(await submitGrades({},form({offering:id,period:id,token,confirmed:"on"}))).toMatchObject({error:expect.stringContaining("Refresh and review")});
 expect(revalidatePath).not.toHaveBeenCalled();
});

import {beforeEach,it,expect,vi} from "vitest";
import {schemeSchema,assignmentSchema} from "@/features/grading/schema";
const {rpc,revalidatePath}=vi.hoisted(()=>({rpc:vi.fn(),revalidatePath:vi.fn()}));
vi.mock("@/lib/auth/session",()=>({requireSession:vi.fn(async()=>({client:{rpc}}))}));
vi.mock("next/cache",()=>({revalidatePath}));
import {saveScheme,approveScheme,assignGrading} from "@/features/grading/actions";
const id="10000000-0000-4000-8000-000000000001";
const base={target_school:id,year_id:id,target:null,expected_version:0,scheme_name:"Scheme",periods:[{name:"P1",starts_on:"2026-06-01",ends_on:"2026-10-31"}],components:[{name:"Written",weight:40},{name:"Performance",weight:60}]};
function form(values:Record<string,string>){const f=new FormData();Object.entries(values).forEach(([k,v])=>f.set(k,v));return f;}
beforeEach(()=>{vi.clearAllMocks();rpc.mockResolvedValue({data:id,error:null});});
it("validates decimal precision, duplicate names, date order and overlaps",()=>{
 expect(schemeSchema.safeParse(base).success).toBe(true);
 expect(schemeSchema.safeParse({...base,components:[{name:"Part",weight:99}]}).success).toBe(true);
 for(const weight of [0,-1,100.01,33.333])expect(schemeSchema.safeParse({...base,components:[{name:"Part",weight}]}).success).toBe(false);
 expect(schemeSchema.safeParse({...base,components:[base.components[0],base.components[0]]}).success).toBe(false);
 expect(schemeSchema.safeParse({...base,periods:[base.periods[0],{name:"P2",starts_on:"2026-10-31",ends_on:"2026-12-01"}]}).success).toBe(false);
 expect(schemeSchema.safeParse({...base,periods:[{name:"Bad",starts_on:"2026-02-30",ends_on:"2026-02-01"}]}).success).toBe(false);
});
it("rejects malformed payloads without writes and passes valid drafts to caller RPC",async()=>{
 expect(await saveScheme({},form({periods:"bad",components:"[]"}))).toHaveProperty("error");expect(rpc).not.toHaveBeenCalled();
 await saveScheme({},form({school:id,year:id,target:"",version:"0",name:"Scheme",periods:JSON.stringify(base.periods),components:JSON.stringify(base.components)}));
 expect(rpc).toHaveBeenCalledWith("save_grading_scheme",base);
});
it("requires explicit approval confirmation and preserves conflict feedback",async()=>{
 expect(await approveScheme({},form({target:id,version:"1"}))).toHaveProperty("error");expect(rpc).not.toHaveBeenCalled();
 rpc.mockResolvedValue({error:{code:"40001"}});
 expect(await approveScheme({},form({target:id,version:"1",confirmed:"on"}))).toMatchObject({error:expect.stringContaining("Preserve your unsaved work")});
});
it("requires all classification fields or an explicit empty selection",async()=>{
 expect(assignmentSchema.safeParse({target:id,expected_version:1,scheme:id,period:null,component:id}).success).toBe(false);
 await assignGrading({},form({target:id,version:"1",scheme:"",period:"",component:""}));
 expect(rpc).toHaveBeenCalledWith("assign_assessment_grading",{target:id,expected_version:1,scheme:null,period:null,component:null});
 expect(revalidatePath).toHaveBeenCalledWith("/teacher","layout");
});

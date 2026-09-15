import {beforeEach,it,expect,vi} from "vitest";
const {rpc,revalidatePath}=vi.hoisted(()=>({rpc:vi.fn(),revalidatePath:vi.fn()}));
vi.mock("@/lib/auth/session",()=>({requireSession:vi.fn(async()=>({client:{rpc}}))}));
vi.mock("next/cache",()=>({revalidatePath}));
import {changeGradeLock} from "@/features/grades/lock-actions";
const id="10000000-0000-4000-8000-000000000001";
function form(values:Record<string,string>){const f=new FormData();Object.entries(values).forEach(([k,v])=>f.set(k,v));return f;}
beforeEach(()=>{vi.clearAllMocks();rpc.mockResolvedValue({error:null});});
it("requires explicit confirmation and a nonblank unlock reason",async()=>{
 const base={target:id,version:"3",operation:"unlock",reason:"",confirmed:"on"};
 expect(await changeGradeLock({},form(base))).toHaveProperty("error");expect(rpc).not.toHaveBeenCalled();
 await changeGradeLock({},form({...base,reason:"Recheck evidence"}));expect(rpc).toHaveBeenCalledWith("set_grade_lock",{target:id,expected_version:3,lock_record:false,reason:"Recheck evidence"});
});
it("reports conflicts without changing the displayed version",async()=>{
 rpc.mockResolvedValue({error:{code:"40001"}});expect(await changeGradeLock({},form({target:id,version:"2",operation:"lock",reason:"",confirmed:"on"}))).toMatchObject({error:expect.stringContaining("Refresh")});expect(revalidatePath).not.toHaveBeenCalled();
});

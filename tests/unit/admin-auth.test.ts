import {beforeEach,describe,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({signIn:vi.fn(),signOut:vi.fn(),rpc:vi.fn(),configured:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{signInWithPassword:mocks.signIn,signOut:mocks.signOut},rpc:mocks.rpc})}));
vi.mock("@/lib/supabase/env",()=>({isSupabaseConfigured:mocks.configured}));
vi.mock("next/navigation",()=>({redirect:(path:string)=>{throw new Error(`REDIRECT:${path}`);}}));
import {loginAdmin} from "@/app/login/actions";
function credentials(){const form=new FormData();form.set("email","admin@example.test");form.set("password","a-long-test-password");return form;}
beforeEach(()=>{vi.clearAllMocks();mocks.configured.mockReturnValue(true);mocks.signIn.mockResolvedValue({error:null});mocks.signOut.mockResolvedValue({error:null});});
describe("superadmin sign-in",()=>{
 it("checks manager authority before redirecting to administration",async()=>{
  mocks.rpc.mockResolvedValue({data:true,error:null});
  await expect(loginAdmin({error:""},credentials())).rejects.toThrow("REDIRECT:/deskonekt/admin");
  expect(mocks.rpc).toHaveBeenCalledWith("is_app_manager");
 });
 it("rejects an authenticated school user and clears the new session",async()=>{
  mocks.rpc.mockResolvedValue({data:false,error:null});
  expect((await loginAdmin({error:""},credentials())).error).toContain("does not have superadmin access");
  expect(mocks.signOut).toHaveBeenCalledOnce();
 });
 it("fails closed when authority cannot be verified",async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{code:"error"}});
  expect((await loginAdmin({error:""},credentials())).error).toContain("does not have superadmin access");
  expect(mocks.signOut).toHaveBeenCalledOnce();
 });
 it("does not accept invalid credentials or expose provider errors",async()=>{
  mocks.signIn.mockResolvedValue({error:{message:"internal provider details"}});
  const result=await loginAdmin({error:""},credentials());
  expect(result.error).toContain("Unable to sign in");expect(result.error).not.toContain("internal provider details");expect(mocks.rpc).not.toHaveBeenCalled();
 });
});

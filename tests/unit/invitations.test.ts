import {beforeEach,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
const m=vi.hoisted(()=>({require:vi.fn(),rpc:vi.fn(),invite:vi.fn()}));
vi.mock("@/features/admin/access",()=>({requireAdmin:m.require}));
vi.mock("@supabase/supabase-js",()=>({createClient:()=>({auth:{admin:{inviteUserByEmail:m.invite}}})}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import {inviteAccount} from "@/features/admin/invitations";
function form(){const f=new FormData();f.set("school_id","10000000-0000-4000-8000-000000000001");f.set("email","new@example.test");f.append("roles","SCHOOL_HEAD");f.set("profile_id","");return f;}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","server-key");vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://example.supabase.co");vi.stubEnv("APP_URL","https://deskonekt.com");m.require.mockResolvedValue({client:{rpc:m.rpc}});m.rpc.mockResolvedValue({error:null});m.invite.mockResolvedValue({data:{user:{id:"user"}},error:null});});
it("checks authorization and preflight before sending, then assigns access",async()=>{expect((await inviteAccount({},form())).success).toContain("roles assigned");expect(m.invite).toHaveBeenCalledWith("new@example.test",{redirectTo:"https://deskonekt.com/auth/accept"});expect(m.rpc).toHaveBeenCalledTimes(2);});
it("does not send when preflight fails",async()=>{m.rpc.mockResolvedValue({error:{code:"23505"}});expect((await inviteAccount({},form())).error).toContain("already exists");expect(m.invite).not.toHaveBeenCalled();});
it("reports email-sent partial failure without deleting accounts or claiming success",async()=>{m.rpc.mockResolvedValueOnce({error:null}).mockResolvedValueOnce({error:{code:"42501"}});const result=await inviteAccount({},form());expect(result.error).toContain("email sent, but role assignment failed");expect(result.success).toBeUndefined();});
it("does not assign roles if email delivery request fails",async()=>{m.invite.mockResolvedValue({data:null,error:{}});expect((await inviteAccount({},form())).error).toContain("Could not send");expect(m.rpc).toHaveBeenCalledTimes(1);});
it("denies non-admin callers before creating an auth client",async()=>{m.require.mockRejectedValue(new Error("Denied"));await expect(inviteAccount({},form())).rejects.toThrow("Denied");expect(m.invite).not.toHaveBeenCalled();});
it("identifies missing configuration without making database or email requests",async()=>{vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY","");const result=await inviteAccount({},form());expect(result.error).toContain("SUPABASE_SERVICE_ROLE_KEY");expect(result.error).toContain("redeploy");expect(result.error).not.toContain("server-key");expect(m.rpc).not.toHaveBeenCalled();expect(m.invite).not.toHaveBeenCalled();});
it("rejects callback origins with paths before sending",async()=>{vi.stubEnv("APP_URL","https://deskonekt.com/teacher");expect((await inviteAccount({},form())).error).toContain("website origin");expect(m.rpc).not.toHaveBeenCalled();expect(m.invite).not.toHaveBeenCalled();});

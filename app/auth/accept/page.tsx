import { AcceptInvitationForm } from "@/components/account-setup-form";
export default async function Accept({searchParams}:{searchParams:Promise<{token_hash?:string}>}) {
 const {token_hash}=await searchParams;
 return <><h1 className="text-2xl font-semibold text-navy">You’re invited to Deskonekt</h1>{token_hash&&token_hash.length<=2048?<><p className="mt-3 text-muted">Accept the invitation to continue as the invited account, then choose your password.</p><AcceptInvitationForm token={token_hash}/></>:<p className="mt-3 text-muted">Open the setup link from your invitation email. If the link is incomplete, contact your school administrator.</p>}</>;
}

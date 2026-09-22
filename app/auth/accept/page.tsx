import { InvitationLanding } from "@/components/invitation-landing";
export default async function Accept({searchParams}:{searchParams:Promise<{token_hash?:string;error?:string;error_code?:string}>}) {
 const {token_hash,error,error_code}=await searchParams;
 return <InvitationLanding token={token_hash} error={error!==undefined||error_code!==undefined}/>;
}

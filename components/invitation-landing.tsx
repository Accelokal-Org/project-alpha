"use client";
import { useSyncExternalStore } from "react";
import { AcceptInvitationForm } from "@/components/account-setup-form";

function subscribe(callback: () => void) {
 window.addEventListener("hashchange", callback);
 return () => window.removeEventListener("hashchange", callback);
}
function callbackStatus() {
 const params = new URLSearchParams(window.location.hash.slice(1));
 if (params.has("error") || params.has("error_code")) return "error";
 if (params.has("access_token") || params.has("refresh_token")) return "legacy";
 return "none";
}
export function InvitationLanding({token,error}:{token?:string;error?:boolean}) {
 const status = useSyncExternalStore(subscribe, callbackStatus, () => "none");
 if (error || status === "error") return <div role="alert"><h1 className="text-2xl font-semibold text-navy">This invitation link is invalid or expired</h1><p className="mt-3 text-muted">The link may have expired or already been used. Ask your school administrator for a new setup link. If you already set your password, use School sign-in below.</p></div>;
 if (status === "legacy") return <div role="alert"><h1 className="text-2xl font-semibold text-navy">A new setup link is needed</h1><p className="mt-3 text-muted">This email uses an unsupported setup link. Ask your school administrator to update the invitation email template and arrange a new setup link.</p></div>;
 return <><h1 className="text-2xl font-semibold text-navy">You’re invited to Deskonekt</h1>{token && token.length<=2048 ? <><p className="mt-3 text-muted">Accept the invitation to continue as the invited account, then choose your password.</p><AcceptInvitationForm token={token}/></> : <p className="mt-3 text-muted">Open the setup link from your invitation email. If the link is incomplete, contact your school administrator.</p>}</>;
}

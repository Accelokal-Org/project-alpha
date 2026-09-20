import {requireSession} from "@/lib/auth/session";
import {portalAccess} from "@/lib/portal-navigation";
import {PortalChrome} from "@/components/navigation/portal-chrome";
export async function AppShell({children,student=false,schoolId}:{children:React.ReactNode;student?:boolean;schoolId?:string}){
 const {user,memberships}=await requireSession();
 const name=[user.user_metadata?.first_name,user.user_metadata?.last_name].filter((v):v is string=>typeof v==='string'&&!!v.trim()).join(' ')||user.email||'School account';
 return <PortalChrome portal={student?'student':'school'} access={portalAccess(memberships)} name={name} schoolId={schoolId}>{children}</PortalChrome>;
}

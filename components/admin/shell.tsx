import {requireAdmin} from "@/features/admin/access";
import {portalAccess} from "@/lib/portal-navigation";
import {PortalChrome} from "@/components/navigation/portal-chrome";
export async function AdminShell({children,schoolId}:{children:React.ReactNode;schoolId?:string}){
 const {user,memberships}=await requireAdmin();
 const name=[user.user_metadata?.first_name,user.user_metadata?.last_name].filter((v):v is string=>typeof v==='string'&&!!v.trim()).join(' ')||user.email||'Administrator';
 return <PortalChrome portal="admin" access={portalAccess(memberships)} name={name} schoolId={schoolId}>{children}</PortalChrome>;
}

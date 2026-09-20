"use client";
import {useRef,useState} from "react";
import {usePathname,useSearchParams} from "next/navigation";
import Image from "next/image";
import {Menu,X,LogOut} from "lucide-react";
import Link from "@/components/ui/navigation-link";
import {SubmitButton} from "@/components/ui/submit-button";
import {logout} from "@/app/login/actions";
import {brand} from "@/lib/brand";
import {portalNavigation,type Portal,type PortalAccess} from "@/lib/portal-navigation";
export function PortalChrome({children,portal,access,name,schoolId}:{children:React.ReactNode;portal:Portal;access:PortalAccess;name:string;schoolId?:string}){
 const path=usePathname(),query=useSearchParams();
 const routeKey=`${path}?${query.toString()}`;
 const [openedAt,setOpenedAt]=useState<string|null>(null);const toggle=useRef<HTMLButtonElement>(null);const open=openedAt===routeKey;
 const groups=portalNavigation(portal,access,path,new URLSearchParams(query.toString()),schoolId);
 const schoolView=['accounts','grading','completion'].includes(query.get('view')??'');
 const title=portal==='admin'?'Admin portal':portal==='student'?'Student portal':schoolView||(access.headSchools.length&&!access.teaching)?'School-head workspace':'Teacher workspace';
 const home=portal==='admin'?'/deskonekt/admin':portal==='student'?'/student':'/teacher';
 return <div className="min-h-screen" onKeyDown={e=>{if(e.key==='Escape'&&open){setOpenedAt(null);toggle.current?.focus();}}}>
 <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
 <header className="sticky top-0 z-30 h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-7 gap-3">
  <div className="flex items-center gap-3 min-w-0"><button ref={toggle} type="button" aria-expanded={open} aria-controls="portal-navigation" aria-label={open?'Close navigation':'Open navigation'} className="md:hidden rounded-md border border-border p-2 text-navy" onClick={()=>setOpenedAt(open?null:routeKey)}>{open?<X size={20}/>:<Menu size={20}/>}</button><Link href={home} className="flex items-center gap-2 text-navy font-semibold text-xl tracking-tight"><Image src="/brand/deskonekt-icon-light-transparent.png" alt="" width={404} height={394} className="h-10 w-auto" sizes="42px"/><span className="flex flex-col leading-tight">{brand.name}<span className="text-[10px] font-normal tracking-normal text-muted mt-0.5">{brand.byline}</span></span></Link><span className="hidden lg:block ml-4 border-l border-border pl-5 text-sm text-muted">{title}</span></div>
  <div className="flex items-center gap-2 min-w-0"><span className="h-8 w-8 shrink-0 bg-purple-50 rounded-full flex items-center justify-center text-primary font-semibold text-xs" aria-hidden>{name.split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase()}</span><span className="hidden sm:block max-w-48 truncate text-sm" title={name}>{name}</span></div>
 </header>
 <div className="md:grid md:grid-cols-[230px_minmax(0,1fr)] min-h-[calc(100vh-64px)]">
  <aside id="portal-navigation" className={`${open?'block':'hidden'} md:block bg-white border-b md:border-b-0 md:border-r border-border md:sticky md:top-16 md:h-[calc(100vh-64px)] overflow-y-auto`}>
   <div className="p-5 pb-3"><p className="text-sm font-semibold text-navy">{title}</p></div>
   <nav aria-label={`${title} navigation`} className="px-3 pb-4 space-y-5" onClick={e=>{if((e.target as Element).closest('a'))setOpenedAt(null);}}>{groups.map(group=><div key={group.label}><p className="px-3 mb-2 text-[10px] uppercase tracking-wider text-muted font-semibold">{group.label}</p><ul className="space-y-1">{group.links.map(link=><li key={link.href}><Link href={link.href} aria-current={link.active?'page':undefined} className={`block px-3 py-2.5 rounded-md text-sm ${link.active?'bg-purple-50 text-primary font-semibold':'text-muted hover:bg-slate-50 hover:text-navy'}`}>{link.label}</Link></li>)}</ul></div>)}</nav>
   <div className="border-t border-border p-4"><form action={logout}><SubmitButton variant="ghost" pendingLabel="Signing out…"><LogOut size={15}/> Sign out</SubmitButton></form></div>
  </aside>
  <main id="main" className="min-w-0 w-full p-5 lg:px-9 lg:py-8 max-w-[1440px] mx-auto">{children}</main>
 </div></div>;
}

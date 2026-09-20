import {isAppManager,isStaff,type Membership} from "./auth/permissions";
export type PortalAccess={admin:boolean;staff:boolean;student:boolean;teaching:boolean;headSchools:string[]};
export type Portal="school"|"admin"|"student";
export type PortalLink={label:string;href:string;active:boolean};
export type PortalGroup={label:string;links:PortalLink[]};
export function portalAccess(memberships:Membership[]):PortalAccess{
 return {admin:isAppManager(memberships),staff:isStaff(memberships),student:memberships.some(m=>m.role==="STUDENT"),teaching:memberships.some(m=>m.role==="TEACHER"||m.role==="ADVISER"),headSchools:[...new Set(memberships.filter(m=>m.role==="SCHOOL_HEAD").map(m=>m.school_id))]};
}
const adminTabs=[['overview','Overview'],['structure','School structure'],['people','People'],['subjects','Subjects'],['assignments','Assignments'],['accounts','Accounts'],['attendance','Attendance settings'],['grading','Grading setup'],['completion','Grade completion'],['audit','Audit history']] as const;
export function portalNavigation(portal:Portal,access:PortalAccess,path:string,query:URLSearchParams,schoolId?:string):PortalGroup[]{
 const groups:PortalGroup[]=[];
 const selected=schoolId??query.get("school")??undefined;
 const headSchool=selected&&(access.admin||access.headSchools.includes(selected))?selected:access.headSchools.length===1?access.headSchools[0]:undefined;
 const headHref=(view:string)=>`/teacher?${new URLSearchParams({view,...(headSchool?{school:headSchool}:{})})}`;
 const view=query.get('view');
 if(portal==='admin'&&access.admin){
  groups.push({label:'Administration',links:[{label:'All schools',href:'/deskonekt/admin',active:path==='/deskonekt/admin'&&!selected},{label:'Set up school',href:'/deskonekt/admin/setup',active:path==='/deskonekt/admin/setup'}]});
  if(selected)groups.push({label:'Selected school',links:adminTabs.map(([tab,label])=>({label,href:`/deskonekt/admin?${new URLSearchParams({school:selected,tab})}`,active:path==='/deskonekt/admin'&&(query.get('tab')??'overview')===tab}))});
 }else if(portal==='student')groups.push({label:'Student portal',links:[{label:'My school',href:'/student',active:path==='/student'}]});
 else if(access.staff){
  groups.push({label:access.headSchools.length&&!access.teaching?'School workspace':'Teaching',links:[{label:'Workspace',href:'/teacher',active:path==='/teacher'&&!['classes','accounts','grading','completion'].includes(view??'')},{label:access.headSchools.length&&!access.teaching?'School classes':'My classes',href:'/teacher?view=classes',active:path.startsWith('/teacher/classes/')||(path==='/teacher'&&view==='classes')}]});
 }
 if(portal!=='admin'&&(access.admin||access.headSchools.length))groups.push({label:'School management',links:[['accounts','School accounts'],['grading','Grading setup'],['completion','Grade completion']].map(([v,label])=>({label,href:headHref(v),active:path==='/teacher'&&view===v}))});
 const switches:PortalLink[]=[];
 if(portal!=='school'&&access.staff)switches.push({label:'Teacher / school workspace',href:'/teacher',active:false});
 if(portal!=='admin'&&access.admin)switches.push({label:'Admin portal',href:'/deskonekt/admin',active:false});
 if(portal!=='student'&&access.student)switches.push({label:'Student portal',href:'/student',active:false});
 if(switches.length)groups.push({label:'Switch workspace',links:switches});
 return groups;
}

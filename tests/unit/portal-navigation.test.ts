import {describe,it,expect} from "vitest";
import {portalAccess,portalNavigation} from "@/lib/portal-navigation";
import type {Membership} from "@/lib/auth/permissions";
const member=(role:Membership['role'],school_id='school-a'):Membership=>({role,school_id,user_id:'user'});
const links=(members:Membership[],path='/teacher',query='',portal:'school'|'admin'|'student'='school',school?:string)=>portalNavigation(portal,portalAccess(members),path,new URLSearchParams(query),school).flatMap(g=>g.links);
describe('portal navigation',()=>{
 it('keeps teacher-only navigation free of head and platform controls',()=>{
  const nav=links([member('TEACHER')]);expect(nav.map(l=>l.label)).toEqual(['Workspace','My classes']);expect(nav.filter(l=>l.active).map(l=>l.label)).toEqual(['Workspace']);
 });
 it('shows heads their school controls without platform administration',()=>{
  const nav=links([member('SCHOOL_HEAD')],'/teacher','view=grading&school=school-a');
  expect(nav.find(l=>l.label==='Grading setup')).toEqual({label:'Grading setup',href:'/teacher?view=grading&school=school-a',active:true});
  expect(nav.filter(l=>l.active)).toHaveLength(1);expect(nav.some(l=>l.href.startsWith('/deskonekt'))).toBe(false);expect(nav.some(l=>l.label==='School classes')).toBe(true);
 });
 it('does not carry a teaching-only school into school-head management links',()=>{
  const nav=links([member('SCHOOL_HEAD'),member('TEACHER','school-b')],'/teacher/classes/subject','', 'school','school-b');
  expect(nav.find(l=>l.label==='School accounts')?.href).toBe('/teacher?view=accounts&school=school-a');
  expect(nav.find(l=>l.label==='My classes')?.active).toBe(true);
 });
 it('retains class school context and admin switch on nested class pages',()=>{
  const nav=links([member('APP_MANAGER')],'/teacher/classes/subject','tab=attendance','school','school-b');
  expect(nav.find(l=>l.label==='School accounts')?.href).toBe('/teacher?view=accounts&school=school-b');expect(nav.find(l=>l.label==='Admin portal')?.href).toBe('/deskonekt/admin');expect(nav.filter(l=>l.active)).toHaveLength(1);
 });
 it('supports cumulative roles and exposes student switching only with student access',()=>{
  expect(links([member('TEACHER'),member('SCHOOL_HEAD'),member('STUDENT')]).map(l=>l.label)).toContain('Student portal');
  const student=links([member('STUDENT')],'/student','','student');expect(student.map(l=>l.label)).toEqual(['My school']);expect(student[0].active).toBe(true);
 });
 it('marks query-based admin sections and onboarding correctly',()=>{
  const nav=links([member('APP_MANAGER')],'/deskonekt/admin','school=school-a&tab=accounts','admin','school-a');
  expect(nav.filter(l=>l.active).map(l=>l.label)).toEqual(['Accounts']);expect(nav.find(l=>l.label==='School structure')?.href).toBe('/deskonekt/admin?school=school-a&tab=structure');
  expect(links([member('APP_MANAGER')],'/deskonekt/admin/setup','','admin').filter(l=>l.active).map(l=>l.label)).toEqual(['Set up school']);
 });
 it('offers school selection when heads manage multiple schools without a selected scope',()=>{
  expect(links([member('SCHOOL_HEAD'),member('SCHOOL_HEAD','school-b')]).find(l=>l.label==='School accounts')?.href).toBe('/teacher?view=accounts');
 });
});

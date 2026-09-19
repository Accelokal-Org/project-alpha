import {it,expect} from "vitest";
import {parseImport} from "@/features/account-imports/schema";
const header="Username,Last Name,First Name,Email,Role\r\n";
it("parses quoted CSV, BOM, CRLF and mixed roles with normalized identifiers",()=>{
 const result=parseImport('\uFEFF'+header+'T.One,"Dela, Cruz",Ana, ANA@gmail.com ,teacher\r\ns.one,Santos,Sam,sam@school.edu,STUDENT\r\n');
 expect(result[0]).toEqual({username:"t.one",last_name:"Dela, Cruz",first_name:"Ana",email:"ana@gmail.com",role:"TEACHER"});expect(result[1].role).toBe("STUDENT");
});
it("rejects malformed files, privileged roles, duplicates and empty names before any import",()=>{
 for(const csv of [header,header+'one,Last,First,not-email,TEACHER',header+'one,Last,First,a@gmail.com,SCHOOL_HEAD',header+'one,,First,a@gmail.com,TEACHER',header+'one,"Last,First,a@gmail.com,TEACHER',header+'one,Last,First,a@gmail.com,TEACHER\none,Last,First,b@gmail.com,TEACHER',header+'one,Last,First,a@gmail.com,TEACHER\ntwo,Last,First,A@gmail.com,STUDENT'])expect(()=>parseImport(csv)).toThrow();
});
it("bounds file size and row count",()=>{expect(()=>parseImport('a'.repeat(100001))).toThrow(/100 KB/);expect(()=>parseImport(header+Array.from({length:101},(_,i)=>`user${i},Last,First,u${i}@gmail.com,TEACHER`).join('\n'))).toThrow(/100 users/);});

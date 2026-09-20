import {z} from "zod";
import {USER_IMPORT_HEADERS} from "./template";
export const importRole=z.enum(["TEACHER","ADVISER","STUDENT"]);
export const importRow=z.object({role:z.string().trim().toUpperCase().pipe(importRole),username:z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,49}$/, "Username must be 3–50 letters, numbers, dots, underscores or hyphens."),last_name:z.string().trim().min(1).max(100),first_name:z.string().trim().min(1).max(100),email:z.string().trim().toLowerCase().pipe(z.email().max(254))});
export type ImportRow=z.infer<typeof importRow>;
export function parseImport(text:string):ImportRow[]{
 if(new TextEncoder().encode(text).length>100_000)throw new Error("Use a CSV smaller than 100 KB.");
 const rows:string[][]=[];let row:string[]=[],value="",quoted=false,closed=false;
 text=text.replace(/^\uFEFF/,"");
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;continue;}
  if(c==='"'){if(value||closed)throw new Error("Invalid CSV quoting.");quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){row.push(value);value="";closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v.trim()))rows.push(row);row=[];}}
  else {if(closed)throw new Error("Invalid characters after a quoted CSV field.");value+=c;}
 }
 if(quoted)throw new Error("The CSV has an unclosed quoted field.");
 row.push(value);if(row.some(v=>v.trim()))rows.push(row);
 const header=rows.shift()?.map(v=>v.trim().toLowerCase());
 if(header?.join(",")!==USER_IMPORT_HEADERS.join(",").toLowerCase())throw new Error("Use the template headers: Username, Last Name, First Name, Email, Role.");
 if(!rows.length||rows.length>100)throw new Error("Upload between 1 and 100 users at a time.");
 const emails=new Set<string>(),names=new Set<string>();
 return rows.map((r,i)=>{if(r.length!==5)throw new Error(`Row ${i+2}: expected five columns.`);const result=importRow.safeParse({username:r[0],last_name:r[1],first_name:r[2],email:r[3],role:r[4]});if(!result.success)throw new Error(`Row ${i+2}: ${result.error.issues[0].message}`);const v=result.data;if(emails.has(v.email)||names.has(v.username))throw new Error(`Row ${i+2}: duplicate email or username.`);emails.add(v.email);names.add(v.username);return v;});
}

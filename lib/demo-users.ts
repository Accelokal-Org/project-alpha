export type DemoRole="School administrator"|"Teacher"|"Registrar"|"Viewer"

export type DemoUser={
  name:string
  email:string
  password:string
  role:DemoRole
}

export const DEMO_SESSION_KEY="eduarchive-demo-user"

export const demoUsers:DemoUser[]=[
  {name:"Juan Dela Cruz",email:"admin@sanisidro.deped.gov.ph",password:"Admin2026!",role:"School administrator"},
  {name:"Maria L. Santos",email:"teacher@sanisidro.deped.gov.ph",password:"Teacher2026!",role:"Teacher"},
  {name:"Ana P. Reyes",email:"registrar@sanisidro.deped.gov.ph",password:"Registrar2026!",role:"Registrar"},
  {name:"Paolo M. Garcia",email:"viewer@sanisidro.deped.gov.ph",password:"Viewer2026!",role:"Viewer"},
]

"use client"

import Link from "next/link"
import {useRouter} from "next/navigation"
import {useState} from "react"
import {BookOpen,GraduationCap,LockKeyhole,ShieldCheck} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Card,CardContent,CardDescription,CardFooter,CardHeader,CardTitle} from "@/components/ui/card"
import {Checkbox} from "@/components/ui/checkbox"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Separator} from "@/components/ui/separator"
import {ThemeToggle} from "@/components/theme-toggle"
import {DEMO_SESSION_KEY,demoUsers,type DemoRole} from "@/lib/demo-users"

export function AuthForm({mode}:{mode:"login"|"signup"}){
  const signup=mode==="signup"
  const router=useRouter()
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState("")
  const[email,setEmail]=useState("")
  const[password,setPassword]=useState("")
  const submit=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();setError("");const data=new FormData(event.currentTarget);if(signup&&data.get("password")!==data.get("confirm-password")){setError("The passwords do not match.");return}const user=signup?{name:String(data.get("full-name")),email,role:String(data.get("role")) as DemoRole}:demoUsers.find(item=>item.email.toLowerCase()===email.trim().toLowerCase()&&item.password===password);if(!user){setError("The email or password doesn’t match a demo account.");return}window.sessionStorage.setItem(DEMO_SESSION_KEY,JSON.stringify({name:user.name,email:user.email,role:user.role}));setLoading(true);setTimeout(()=>router.push("/"),650)}
  return <main className="auth-page">
    <section className="auth-story">
      <div className="auth-brand"><span>EA</span><div><b>EduArchive</b><small>Schools Division Portal</small></div></div>
      <div className="auth-copy">
        <span className="auth-kicker"><GraduationCap/> Built for Philippine schools</span>
        <h1>{signup?"Bring your school records into one trusted workspace.":"Welcome back to your school workspace."}</h1>
        <p>Manage learner records, grades, attendance, lesson plans, and official reports with clarity and confidence.</p>
        <div className="auth-points"><span><ShieldCheck/><b>Role-based access</b><small>Each team member sees only what they need.</small></span><span><BookOpen/><b>One academic record</b><small>Keep daily workflows connected and up to date.</small></span></div>
      </div>
      <p className="auth-footnote">EduArchive · Project Alpha interactive prototype</p>
    </section>
    <section className="auth-form-side">
      <div className="auth-top"><ThemeToggle/></div>
      <Card className="auth-card">
        <CardHeader>
          <CardTitle>{signup?"Create your account":"Log in to EduArchive"}</CardTitle>
          <CardDescription>{signup?"Set up access for your school workspace.":"Enter your school account details to continue."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="auth-fields">
            {signup&&<div className="auth-field"><Label htmlFor="full-name">Full name</Label><Input id="full-name" name="full-name" placeholder="Juan Dela Cruz" required/></div>}
            <div className="auth-field"><Label htmlFor="email">DepEd email address</Label><Input id="email" name="email" type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="name@deped.gov.ph" required/></div>
            {signup&&<div className="auth-field"><Label htmlFor="school-id">School ID</Label><Input id="school-id" inputMode="numeric" placeholder="e.g. 136742" required/></div>}
            {signup&&<div className="auth-field"><Label htmlFor="role">Primary role</Label><select id="role" name="role" className="shadcn-select" required defaultValue=""><option value="" disabled>Select your role</option><option>School administrator</option><option>Teacher</option><option>Registrar</option><option>Viewer</option></select></div>}
            <div className="auth-field"><div className="auth-label-row"><Label htmlFor="password">Password</Label>{!signup&&<Link href="/forgot-password">Forgot password?</Link>}</div><Input id="password" name="password" type="password" value={password} onChange={event=>setPassword(event.target.value)} placeholder={signup?"At least 8 characters":"Enter your password"} minLength={8} required/></div>
            {signup&&<div className="auth-field"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" name="confirm-password" type="password" placeholder="Re-enter your password" minLength={8} required/></div>}
            <label className="check-row"><Checkbox required={signup}/><span>{signup?<>I agree to the <Link href="/terms">terms of use</Link> and <Link href="/privacy">privacy policy</Link>.</>:"Keep me signed in on this device"}</span></label>
            {error&&<p className="form-error" role="alert">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>{loading?"Preparing your workspace…":signup?"Create account":"Log in"}</Button>
          </form>
          <div className="auth-divider"><Separator/><span>Secure school access</span><Separator/></div>
          {!signup&&<div className="demo-accounts"><div><b>Demo accounts</b><small>Select a role to fill its credentials.</small></div>{demoUsers.map(user=><button type="button" key={user.email} onClick={()=>{setEmail(user.email);setPassword(user.password);setError("")}}><span><b>{user.role}</b><small>{user.email}</small></span><em>Use</em></button>)}</div>}
          <div className="auth-security"><LockKeyhole/><span><b>Protected by role-based permissions</b><small>Production authentication will be connected after prototype approval.</small></span></div>
        </CardContent>
        <CardFooter>{signup?<>Already have an account? <Link href="/login">Log in</Link></>:<>New to EduArchive? <Link href="/signup">Create an account</Link></>}</CardFooter>
      </Card>
    </section>
  </main>
}

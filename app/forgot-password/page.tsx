"use client"

import Link from "next/link"
import {useState} from "react"
import {ArrowLeft,CheckCircle2,KeyRound} from "lucide-react"
import {ThemeToggle} from "@/components/theme-toggle"
import {Button} from "@/components/ui/button"
import {Card,CardContent,CardDescription,CardFooter,CardHeader,CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"

export default function ForgotPasswordPage(){
  const[sentTo,setSentTo]=useState("")
  return <main className="standalone-page">
    <div className="standalone-top"><Button asChild variant="ghost" size="sm"><Link href="/login"><ArrowLeft/>Back to login</Link></Button><ThemeToggle/></div>
    <Card className="standalone-card">
      <CardHeader><span className="standalone-icon">{sentTo?<CheckCircle2/>:<KeyRound/>}</span><CardTitle>{sentTo?"Check your inbox":"Reset your password"}</CardTitle><CardDescription>{sentTo?`A reset link was sent to ${sentTo}.`:"Enter your DepEd email and we’ll send a secure reset link."}</CardDescription></CardHeader>
      <CardContent>{sentTo?<p className="prototype-note">This is an interactive prototype, so no real email was sent. The completed state demonstrates the intended recovery flow.</p>:<form className="auth-fields" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);setSentTo(String(data.get("email")))}}><div className="auth-field"><Label htmlFor="reset-email">DepEd email address</Label><Input id="reset-email" name="email" type="email" placeholder="name@deped.gov.ph" required/></div><Button type="submit">Send reset link</Button></form>}</CardContent>
      <CardFooter>{sentTo?<Button variant="outline" onClick={()=>setSentTo("")}>Use another email</Button>:<span>Remembered your password? <Link href="/login">Log in</Link></span>}</CardFooter>
    </Card>
  </main>
}

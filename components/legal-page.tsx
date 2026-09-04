import Link from "next/link"
import {ArrowLeft,BookOpen} from "lucide-react"
import {ThemeToggle} from "@/components/theme-toggle"
import {Button} from "@/components/ui/button"
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from "@/components/ui/card"

export function LegalPage({kind}:{kind:"terms"|"privacy"}){
  const privacy=kind==="privacy"
  return <main className="standalone-page legal-page">
    <div className="standalone-top"><Button asChild variant="ghost" size="sm"><Link href="/signup"><ArrowLeft/>Back to sign up</Link></Button><ThemeToggle/></div>
    <Card className="standalone-card legal-card">
      <CardHeader><span className="standalone-icon"><BookOpen/></span><CardTitle>{privacy?"Privacy policy":"Terms of use"}</CardTitle><CardDescription>Prototype policy summary · Effective September 4, 2026</CardDescription></CardHeader>
      <CardContent>
        {privacy?<>
          <section><h2>Information handled</h2><p>EduArchive is designed to hold learner profiles, academic records, attendance, school documents, and authorized staff account details.</p></section>
          <section><h2>Purpose and access</h2><p>Information is used only for approved school administration and teaching workflows. Role-based permissions limit access according to assigned responsibilities.</p></section>
          <section><h2>Prototype notice</h2><p>This demo uses in-browser sample data and is not connected to a production database. Final privacy, retention, and DepEd compliance terms require formal legal and security review.</p></section>
        </>:<>
          <section><h2>Authorized use</h2><p>Accounts are intended for approved school personnel. Users must protect their credentials and handle learner information only for legitimate educational duties.</p></section>
          <section><h2>Record accuracy</h2><p>Authorized staff are responsible for reviewing entries before submitting or printing official school records.</p></section>
          <section><h2>Prototype notice</h2><p>EduArchive Project Alpha is an interactive demonstration. These terms are placeholders and must be replaced by approved production terms before launch.</p></section>
        </>}
      </CardContent>
    </Card>
  </main>
}

import type {Metadata} from "next"
import {AuthForm} from "@/components/auth-form"
export const metadata:Metadata={title:"Log in | EduArchive",description:"Log in to your EduArchive school workspace."}
export default function LoginPage(){return <AuthForm mode="login"/>}

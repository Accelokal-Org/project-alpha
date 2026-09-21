"use client";
import Link, { useLinkStatus } from "next/link";
import { Spinner } from "./feedback";
function PendingHint(){const {pending}=useLinkStatus();return pending?<span role="status" className="pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs text-primary shadow-sm"><Spinner/><span>Loading page…</span></span>:null;}
export default function NavigationLink({children,prefetch=false,...props}:React.ComponentProps<typeof Link>){return <Link {...props} prefetch={prefetch}>{children}<PendingHint/></Link>;}

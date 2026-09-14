"use client";
import { Button } from "@/components/ui/button";
export default function AdminError({reset}:{reset:()=>void}) {
 return <main className="p-8"><h1 className="text-xl font-semibold">Administration could not be loaded</h1><p className="text-muted my-4">Check the Supabase connection and apply the latest migrations, then try again.</p><Button onClick={reset}>Try again</Button></main>;
}

"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
 return <main className="p-10"><h1 className="text-xl font-semibold">The workspace could not be loaded</h1><p className="my-4 text-muted">Please try again. If the problem continues, contact your school administrator.</p><Button onClick={reset}>Try again</Button></main>;
}

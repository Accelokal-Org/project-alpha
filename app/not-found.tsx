import Link from "next/link";
export default function NotFound() { return <main className="p-10"><h1 className="text-xl font-semibold">This page is not available</h1><p className="text-muted my-4">The record may not exist or may be outside your assignments.</p><Link href="/" className="text-primary">Return to sign-in</Link></main>; }

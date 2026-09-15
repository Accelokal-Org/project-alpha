import Link from "@/components/ui/navigation-link";
export const dynamic="force-dynamic";
export const metadata={title:"Set up your account",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default function AuthLayout({children}:{children:React.ReactNode}) {
 return <main className="min-h-screen grid place-items-center p-6"><section className="w-full max-w-md border border-border bg-white rounded-lg p-8"><p className="font-semibold text-xl text-navy mb-6">Deskonekt <span className="block text-xs text-muted font-normal">by Accelokal</span></p>{children}<Link href="/login" className="inline-block mt-6 text-sm text-primary">School sign-in</Link></section></main>;
}

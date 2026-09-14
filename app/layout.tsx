import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import "./globals.css";
export const metadata: Metadata = { applicationName: brand.name, title: { default: `${brand.name} · ${brand.tagline}`, template: `%s · ${brand.name}` }, description: `${brand.tagline} A seamless academic workspace built around the teacher. ${brand.byline}.`, robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
 return <html lang="en"><body>{children}</body></html>;
}

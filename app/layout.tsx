import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: { default: "EduArchive · School records", template: "%s · EduArchive" }, description: "A teacher-first workspace for school academic records.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
 return <html lang="en"><body>{children}</body></html>;
}

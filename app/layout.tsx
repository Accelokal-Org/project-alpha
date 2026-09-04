import type { Metadata } from "next";
import { Source_Sans_3, Merriweather } from "next/font/google";
import "./globals.css";
const sans=Source_Sans_3({variable:"--font-sans",subsets:["latin"]});
const serif=Merriweather({variable:"--font-serif",weight:["700"],subsets:["latin"]});
export const metadata:Metadata={title:"EduArchive — School Records & Student Management",description:"A unified school workflow for learner records, grades, attendance, planning and reports.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={`${sans.variable} ${serif.variable}`}>{children}</body></html>}

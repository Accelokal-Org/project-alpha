"use client"
import {Moon,Sun} from "lucide-react"
import {useTheme} from "next-themes"
import {Button} from "@/components/ui/button"

export function ThemeToggle({className}:{className?:string}){
  const{resolvedTheme,setTheme}=useTheme()
  return <Button type="button" className={`theme-toggle ${className??""}`} variant="outline" size="icon" aria-label="Toggle light and dark mode" onClick={()=>setTheme(resolvedTheme==="dark"?"light":"dark")}><Sun className="sun h-4 w-4"/><Moon className="moon h-4 w-4"/></Button>
}

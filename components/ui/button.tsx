import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const variants = cva("inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:pointer-events-none disabled:opacity-50", {
 variants: { variant: { default: "bg-primary text-white hover:bg-primary/90", outline: "border border-border bg-white text-foreground hover:bg-slate-50", ghost: "hover:bg-slate-100 text-foreground" }, size: { default: "h-9 px-3.5", sm: "h-8 px-3 text-xs" } }, defaultVariants: { variant: "default", size: "default" },
});
export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof variants> & { asChild?: boolean }) {
 const Comp = asChild ? Slot : "button";
 return <Comp className={cn(variants({ variant, size, className }))} {...props} />;
}

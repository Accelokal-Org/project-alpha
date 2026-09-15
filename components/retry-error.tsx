"use client";
import { useTransition } from "react";
import { Button } from "./ui/button";
import { Spinner } from "./ui/feedback";
export function RetryError({reset,title="This page could not be loaded"}:{reset:()=>void;title?:string}) {
 const [pending,startTransition]=useTransition();
 return <div className="max-w-lg mx-auto p-8"><h1 className="text-xl font-semibold text-navy">{title}</h1><p role="alert" className="my-4 text-muted">Please try again. If the problem continues, contact your school administrator.</p><Button disabled={pending} aria-busy={pending} onClick={()=>startTransition(()=>reset())}>{pending&&<Spinner/>}{pending?"Trying again…":"Try again"}</Button></div>;
}

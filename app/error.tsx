"use client";
import { RetryError } from "@/components/retry-error";
export default function ErrorPage({reset}:{reset:()=>void}){return <RetryError reset={reset}/>;}

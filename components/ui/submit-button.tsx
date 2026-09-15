"use client";
import { useFormStatus } from "react-dom";
import { Button } from "./button";
import { Spinner } from "./feedback";
export function SubmitButton({children,pendingLabel="Saving…",disabled,...props}:React.ComponentProps<typeof Button>&{pendingLabel?:string}) {
 const {pending}=useFormStatus();
 return <Button {...props} type="submit" disabled={disabled||pending} aria-busy={pending}>{pending&&<Spinner/>}{pending?pendingLabel:children}</Button>;
}

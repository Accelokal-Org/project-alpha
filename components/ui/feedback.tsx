import { CircleCheck, CircleAlert, LoaderCircle } from "lucide-react";
export function Spinner({className=""}:{className?:string}) {return <LoaderCircle aria-hidden="true" size={16} className={`shrink-0 motion-safe:animate-spin ${className}`}/>;}
export function ActionFeedback({pending,error,success}:{pending?:boolean;error?:string;success?:string}) {
 const message=pending?"Please wait while we finish your request…":error||success;
 if(!message)return null;
 return <div role={error&&!pending?"alert":"status"} aria-atomic="true" className={`flex items-start gap-2 rounded-md border p-3 text-sm ${pending?"border-purple-100 bg-purple-50 text-primary":error?"border-red-200 bg-red-50 text-red-800":"border-teal-200 bg-teal-50 text-teal-900"}`}>
 {pending?<Spinner/>:error?<CircleAlert size={17} className="shrink-0 mt-0.5" aria-hidden/>:<CircleCheck size={17} className="shrink-0 mt-0.5" aria-hidden/>}<span>{message}</span></div>;
}

import { Spinner } from "@/components/ui/feedback";

type LoadingVariant = "workspace" | "roster" | "admin" | "form";
function Bone({ className = "" }: { className?: string }) {
  return <div className={`skeleton-surface rounded-md ${className}`} />;
}
function StatCards() {
  return <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map(n =>
    <div key={n} className="rounded-lg border border-border bg-white p-5 space-y-5">
      <div className="flex justify-between items-center gap-4"><Bone className="h-3 w-28" /><Bone className="h-8 w-8 rounded-lg" /></div>
      <Bone className="h-8 w-14" /><Bone className="h-2.5 w-24" />
    </div>)}</div>;
}
function TableRows() {
  return <div className="overflow-hidden rounded-lg border border-border bg-white">
    <div className="flex items-center justify-between gap-5 border-b border-border p-5"><Bone className="h-4 w-36" /><Bone className="h-6 w-16" /></div>
    <div className="grid grid-cols-[minmax(0,2fr)_1fr] sm:grid-cols-[minmax(0,2fr)_1fr_1fr] gap-6 bg-slate-50 px-5 py-3 border-b border-border"><Bone className="h-2.5 w-20" /><Bone className="h-2.5 w-16" /><Bone className="hidden sm:block h-2.5 w-20" /></div>
    {[0, 1, 2, 3, 4].map(n => <div key={n} className="grid grid-cols-[minmax(0,2fr)_1fr] sm:grid-cols-[minmax(0,2fr)_1fr_1fr] items-center gap-6 px-5 py-4 border-b last:border-b-0 border-slate-100">
      <div className="flex items-center gap-3 min-w-0"><Bone className="h-9 w-9 rounded-full shrink-0" /><div className="space-y-2 min-w-0 flex-1"><Bone className={`h-3 ${n % 2 ? "w-3/4" : "w-full max-w-40"}`} /><Bone className="h-2.5 w-16" /></div></div>
      <Bone className="h-6 w-16 max-w-full rounded-full" /><Bone className="hidden sm:block h-3 w-3/4 max-w-28" />
    </div>)}
  </div>;
}
function FormFields() {
  return <div className="space-y-6">{[0, 1, 2].map(n => <div key={n} className="space-y-2.5"><Bone className="h-3 w-28" /><Bone className="h-11 w-full" /></div>)}<Bone className="h-11 w-44 max-w-full rounded-lg" /></div>;
}
function LoadingContent({ variant }: { variant: LoadingVariant }) {
  return <div aria-hidden="true" className="space-y-6">
    <div className="space-y-3"><Bone className="h-3 w-28" /><Bone className="h-8 w-56 max-w-full" /><Bone className="h-3.5 w-3/4 max-w-md" /></div>
    {variant === "form" ? <FormFields /> : <>
      {variant === "workspace" && <StatCards />}
      {variant === "roster" && <div className="flex gap-3 overflow-hidden border-b border-border pb-3">{[0, 1, 2, 3].map(n => <Bone key={n} className="h-8 w-24 shrink-0" />)}</div>}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr]"><Bone className="h-10 w-full" /><Bone className="h-10 hidden sm:block" /><Bone className="h-10 hidden sm:block" /></div>
      {variant === "admin" && <div className="grid sm:grid-cols-2 gap-4">{[0, 1].map(n => <div key={n} className="border border-border rounded-lg bg-white p-5 space-y-4"><Bone className="h-4 w-32" /><Bone className="h-3 w-3/4" /><Bone className="h-9 w-28" /></div>)}</div>}
      <TableRows />
    </>}
  </div>;
}
export function PageLoading({ label = "Loading your workspace…", variant = "workspace", frame = "portal" }: {
  label?: string; variant?: LoadingVariant; frame?: "portal" | "content";
}) {
  const content = <><div role="status" aria-live="polite" className="mb-6 flex items-center gap-2.5 text-sm text-muted"><Spinner className="text-primary" /><span>{label}</span></div><LoadingContent variant={variant} /></>;
  if (frame === "content") return <div className="w-full min-w-0" aria-busy="true">{content}</div>;
  return <div className="min-h-screen" aria-busy="true">
    <div aria-hidden="true" className="h-16 bg-white border-b border-border flex items-center justify-between gap-5 px-4 lg:px-7"><div className="flex items-center gap-3"><Bone className="md:hidden h-9 w-9" /><Bone className="h-10 w-10 rounded-lg" /><div className="space-y-2"><Bone className="h-5 w-28" /><Bone className="h-2 w-16" /></div></div><Bone className="h-8 w-8 rounded-full" /></div>
    <div className="md:grid md:grid-cols-[230px_minmax(0,1fr)] min-h-[calc(100vh-64px)]">
      <div aria-hidden="true" className="hidden md:block bg-white border-r border-border p-5 space-y-7"><Bone className="h-4 w-36" />{[0, 1].map(group => <div key={group} className="space-y-4"><Bone className="h-2.5 w-20" />{[0, 1, 2].map(n => <div key={n} className="flex items-center gap-3 py-1"><Bone className="h-5 w-5 shrink-0" /><Bone className={`h-3 ${n === 1 ? "w-24" : "w-28"}`} /></div>)}</div>)}</div>
      <div className={`w-full min-w-0 mx-auto p-5 lg:px-9 lg:py-8 ${variant === "form" ? "max-w-3xl" : "max-w-[1440px]"}`}>{content}</div>
    </div>
  </div>;
}

import "server-only";

// Only the error text is passed to the client, never environment values.
export function invitationConfigurationError(): string | undefined {
 const missing = ["APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(name => !process.env[name]?.trim());
 if (missing.length) return `Invitations are unavailable. Missing server configuration: ${missing.join(", ")}. Add these in Vercel Project Settings → Environment Variables for this deployment's environment, then redeploy. Set APP_URL to https://deskonekt.com. Keep the service-role key server-only.`;
 try {
  const u = new URL(process.env.APP_URL!.trim());
  if ((u.protocol !== "https:" && !(u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname))) || u.username || u.password || u.pathname !== "/" || u.search || u.hash) throw new Error();
 } catch { return "APP_URL must be the website origin, such as https://deskonekt.com. Update it in Vercel and redeploy."; }
}

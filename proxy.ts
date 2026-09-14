import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/env";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const schoolPath = request.nextUrl.pathname === "/teacher" || request.nextUrl.pathname.startsWith("/teacher/") || request.nextUrl.pathname === "/student";
  const signIn = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    const loginResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach(cookie => loginResponse.cookies.set(cookie));
    loginResponse.headers.set("Cache-Control", "private, no-store");
    return loginResponse;
  };
  if (!isSupabaseConfigured()) return schoolPath ? signIn() : response;
  const { url, key } = supabaseConfig();
  const client = createServerClient(url, key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(values) {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  } });
  const { data, error } = await client.auth.getClaims();
  if (schoolPath && (error || !data?.claims)) return signIn();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/login", "/auth/:path*", "/teacher/:path*", "/student/:path*", "/deskonekt/admin/:path*"] };

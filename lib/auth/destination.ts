// Accept only implemented school routes, never external URLs or admin destinations.
export function schoolDestination(value: unknown): string | null {
 if (typeof value !== "string" || !/^\/(teacher|student)(?:[/?]|$)/.test(value) || /[\\\x00-\x20]/.test(value)) return null;
 const url = new URL(value, "https://deskonekt.invalid");
 if (url.origin !== "https://deskonekt.invalid") return null;
 if (url.pathname !== "/teacher" && url.pathname !== "/student" && !/^\/teacher\/classes\/(?:advisory-)?[0-9a-f-]{36}$/i.test(url.pathname)) return null;
 return url.pathname + url.search;
}

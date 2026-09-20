import { USER_IMPORT_FILENAME, USER_IMPORT_TEMPLATE } from "@/features/account-imports/template";

// The blank template is public and contains no school or user records.
export function GET() {
  return new Response(USER_IMPORT_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${USER_IMPORT_FILENAME}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

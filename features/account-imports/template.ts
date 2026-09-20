// Shared by the download and parser so their column names cannot drift apart.
export const USER_IMPORT_HEADERS = ["Username", "Last Name", "First Name", "Email", "Role"] as const;
export const USER_IMPORT_FILENAME = "deskonekt-user-import.csv";
// BOM helps Excel recognize UTF-8; CRLF supplies an actual spreadsheet row ending.
export const USER_IMPORT_TEMPLATE = "\uFEFF" + USER_IMPORT_HEADERS.join(",") + "\r\n";

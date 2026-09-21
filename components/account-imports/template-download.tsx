import { createElement } from "react";
import { USER_IMPORT_FILENAME, USER_IMPORT_TEMPLATE } from "../../features/account-imports/template";

// A native download link works before hydration and without a server request.
export function TemplateDownloadLink() {
  return createElement("a", {
    className: "text-primary text-sm underline",
    href: `data:text/csv;charset=utf-8,${encodeURIComponent(USER_IMPORT_TEMPLATE)}`,
    download: USER_IMPORT_FILENAME,
  }, "Download CSV template");
}

import sanitizeHtml from "sanitize-html";

// Defense-in-depth against stored XSS: strip all markup from free-text fields
// before they ever hit the database. React escapes on render too, but we
// don't want to rely on that alone (e.g. data reused in emails, exports, PDFs).
export function sanitizePlainText(input: string): string {
  const stripped = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
  return stripped.trim();
}

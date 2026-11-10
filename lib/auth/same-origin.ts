/** Only same-origin browser POSTs may cause generation; no permissive CORS. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const configuredOrigin = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : new URL(request.url).origin;
    return origin === configuredOrigin;
  } catch {
    return false;
  }
}

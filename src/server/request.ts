import { isIP } from "node:net";

// Enable only behind a trusted proxy that replaces client-supplied forwarding headers.
export function requestClientKey(request: Pick<Request, "headers">): string {
  if (process.env.TRUST_PROXY !== "true") return "local";
  const candidate = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim();
  return candidate && isIP(candidate) ? candidate : "local";
}

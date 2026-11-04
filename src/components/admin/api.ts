export type Reply<T> = { data: T; version?: number };
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<Reply<T>> {
  const multipart = body instanceof FormData;
  const response = await fetch(`/api/admin/${path}`, {
    method,
    cache: "no-store",
    headers: {
      "x-requested-with": "CMS",
      ...(body && !multipart ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
  });
  const result = await response.json();
  if (!response.ok) {
    const fields = result.error?.fields as
      | Record<string, string[] | undefined>
      | undefined;
    const details = fields
      ? Object.entries(fields)
          .filter(([, messages]) => messages?.length)
          .map(([field, messages]) => `${field}: ${messages!.join(", ")}`)
          .join("; ")
      : "";
    throw new Error(
      `${result.error?.message || `Request failed (${response.status})`}${details ? `: ${details}` : ""}`,
    );
  }
  return result as Reply<T>;
}

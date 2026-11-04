import { NextRequest, NextResponse } from "next/server";
import { getRedirect } from "@/server/public";
export async function proxy(request: NextRequest) {
  const destination = await getRedirect(request.nextUrl.pathname);
  if (destination) {
    const url = new URL(destination, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/((?!api|admin|_next|uploads|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

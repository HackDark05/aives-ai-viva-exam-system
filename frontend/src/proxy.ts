import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeTokenClaims } from "@/lib/session-token";

const PUBLIC_PATHS = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const token = request.cookies.get("aives_token")?.value;
  const isAuthed = Boolean(token);
  const { pathname } = request.nextUrl;

  if (pathname === "/login" && isAuthed) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!PUBLIC_PATHS.has(pathname) && !isAuthed) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const role = token ? decodeTokenClaims(token)?.role : null;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/signin", "/signup"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;

  if (!token) {
    if (!PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  } else {
    // Redirect logged-in users away from auth pages
    if (PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

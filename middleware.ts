import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  // const role = req.cookies.get("role")?.value;

  if (!token) {
    if (!["/auth/login", "/auth/register"].includes(pathname)) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  } else {
    // if (["/auth/login", "/auth/register"].includes(pathname)) {
    //   return NextResponse.redirect(new URL("/", req.url));
    // const roles = role?.toLowerCase();
    // if (roles === "admin") {
    //   return NextResponse.redirect(new URL("/admin", req.url));
    // } else {
    //   return NextResponse.redirect(new URL("/user", req.url));
    // }
    // }
  }

  return NextResponse.next();
}

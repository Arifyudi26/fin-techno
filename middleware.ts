import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Halaman publik (tidak perlu login)
const PUBLIC_PAGE_PATHS = ["/auth/login", "/auth/register", "/signin", "/signup", "/auth/oauth-callback"];

// API yang boleh diakses tanpa token
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/callback",   // NextAuth OAuth callback
  "/api/auth/signin",     // NextAuth signin
  "/api/auth/signout",    // NextAuth signout
  "/api/auth/session",    // NextAuth session
  "/api/auth/csrf",       // NextAuth CSRF token
  "/api/auth/providers",  // NextAuth providers
  "/api/auth/error",      // NextAuth error page
  "/api/auth/_log",       // NextAuth internal
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Abaikan Next.js internal
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // ── API routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith("/api")) {
    // Auth API boleh tanpa token
    if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // Semua API lain wajib ada Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  // ── Page routes ─────────────────────────────────────────────────────────
  const token = req.cookies.get("token")?.value;

  if (!token) {
    if (!PUBLIC_PAGE_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  } else {
    if (PUBLIC_PAGE_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Halaman publik (tidak perlu login)
const PUBLIC_PAGE_PATHS = ["/auth/login", "/auth/register", "/auth/change-password", "/signin", "/signup", "/auth/oauth-callback", "/docs"];

// API yang boleh diakses tanpa token
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/callback",    
  "/api/auth/signin",     
  "/api/auth/signout",    
  "/api/auth/session",    
  "/api/auth/csrf",        
  "/api/auth/providers",  
  "/api/auth/error",       
  "/api/auth/_log",       
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Abaikan Next.js internal
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // API routes 
  if (pathname.startsWith("/api")) {
    // Auth API boleh tanpa token
    if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // SSE stream: EventSource can't send headers, accept token via query param
    if (pathname === "/api/notifications/stream") {
      const tokenParam = req.nextUrl.searchParams.get("token");
      if (tokenParam) return NextResponse.next();
    }

    // Semua API lain wajib ada Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  // Page routes 
  const token = req.cookies.get("token")?.value;

  if (!token) {
    if (!PUBLIC_PAGE_PATHS.includes(pathname) && !pathname.startsWith("/docs")) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  } else {
    // oauth-callback dan docs selalu boleh diakses meski ada token
    if (PUBLIC_PAGE_PATHS.includes(pathname) && pathname !== "/auth/oauth-callback" && !pathname.startsWith("/docs")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

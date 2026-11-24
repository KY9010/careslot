import { NextResponse, type NextRequest } from "next/server";

// Fast, "optimistic" check that runs before a page renders: no session cookie
// on a private page means "go log in". The real permission checks happen on
// the server in src/lib/dal.ts, because a cookie can exist but be invalid.
const PROTECTED = ["/appointments", "/book", "/schedule", "/dashboard"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !request.cookies.has("careslot_session")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/appointments/:path*", "/book/:path*", "/schedule/:path*", "/dashboard"],
};

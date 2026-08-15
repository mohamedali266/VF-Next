import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session;
  const role = session?.user?.role;

  const isLoginPage = nextUrl.pathname === "/login";
  const isEmployeePath = nextUrl.pathname.startsWith("/employee");
  const isManagerPath = nextUrl.pathname.startsWith("/manager");
  const isAdminPath = nextUrl.pathname.startsWith("/admin");

  // Redirect to login if not authenticated
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Redirect to dashboard if already logged in
  if (isLoggedIn && isLoginPage) {
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin", nextUrl));
    if (role === "MANAGER" || role === "TEAM_LEADER") return NextResponse.redirect(new URL("/manager", nextUrl));
    return NextResponse.redirect(new URL("/employee", nextUrl));
  }

  // Role-based access control
  if (isAdminPath && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl));
  }
  if (isEmployeePath && role !== "EMPLOYEE") {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl));
  }
  if (isManagerPath && role !== "MANAGER" && role !== "TEAM_LEADER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

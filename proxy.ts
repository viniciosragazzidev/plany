import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy function to handle authentication and route protection.
 * Following the new Next.js 16.2.6 convention where middleware is renamed to proxy.
 */
export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    const { pathname } = request.nextUrl;

    // Define public routes
    const publicPaths = ["/", "/login", "/register"];
    const isPublicPath = publicPaths.includes(pathname);

    // If the user is not logged in and tries to access a protected route
    if (!session && !isPublicPath) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If the user is logged in and tries to access login or register pages
    if (session && (pathname === "/login" || pathname === "/register")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

// Config matcher to exclude internal Next.js paths and static assets
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};

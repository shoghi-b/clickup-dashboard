import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');

  // Allow access to login page and auth API routes
  if (isLoginPage || isApiAuthRoute) {
    return NextResponse.next();
  }

  // If no session, redirect to login
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Validate session expiration and roles
  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString()
    );

    console.log('Middleware Debug:', {
      path: request.nextUrl.pathname,
      role: sessionData.role,
      hasSession: !!sessionCookie
    });

    // Check if session is expired
    if (Date.now() > sessionData.expiresAt) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }

    const { role } = sessionData;

    // Role-based protection
    if (request.nextUrl.pathname.startsWith('/manager')) {
      if (role !== 'manager') {
        // Redirect unauthorized users to their appropriate dashboard or login
        if (role === 'member') {
          return NextResponse.redirect(new URL('/member', request.url));
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    if (request.nextUrl.pathname.startsWith('/member')) {
      if (role !== 'member') {
        // Redirect unauthorized users (even managers) to their dashboard
        if (role === 'manager') {
          return NextResponse.redirect(new URL('/manager', request.url));
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // Redirect root to appropriate dashboard based on role
    if (request.nextUrl.pathname === '/') {
      if (role === 'manager') {
        return NextResponse.redirect(new URL('/manager', request.url));
      } else if (role === 'member') {
        return NextResponse.redirect(new URL('/member', request.url));
      }
    }

  } catch (error) {
    // Invalid session, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

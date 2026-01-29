import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Parse session token
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString()
      );

      // Check if session is expired
      if (Date.now() > sessionData.expiresAt) {
        cookieStore.delete('session');
        return NextResponse.json(
          { authenticated: false, error: 'Session expired' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          email: sessionData.email,
          role: sessionData.role,
        },
      });
    } catch (parseError) {
      // Invalid session token
      cookieStore.delete('session');
      return NextResponse.json(
        { authenticated: false, error: 'Invalid session' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

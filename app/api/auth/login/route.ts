import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const USER_EMAIL = 'shoghi@tcules.com';
const USER_PASSWORD = 'Shoghi07';
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate credentials
    if (email !== USER_EMAIL || password !== USER_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session token
    const sessionToken = Buffer.from(
      JSON.stringify({
        email,
        expiresAt: Date.now() + SESSION_DURATION,
      })
    ).toString('base64');

    // Set cookie with 2-hour expiration
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000, // Convert to seconds
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

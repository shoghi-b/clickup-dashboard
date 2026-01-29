import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
// import { compare } from 'bcryptjs'; // TODO: Install bcryptjs for secure hashing

const ADMIN_EMAIL = 'admin@tcules.com';
const ADMIN_PASSWORD = 'Admin@123#'; // In production, this should be in .env
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    let role = 'guest';
    let redirectUrl = '/login';
    let userId = null;
    let userEmail = email;

    // 1. Check if Admin
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      role = 'manager';
      redirectUrl = '/manager';
    }
    // 2. Check if Team Member
    else {
      const member = await prisma.teamMember.findFirst({
        where: { email },
      });

      if (member) {
        if (!member.password) {
          return NextResponse.json(
            { success: false, error: 'Account not activated. Please contact your admin to set your password.' },
            { status: 401 }
          );
        }

        // TODO: Use secure comparison (bcrypt.compare)
        if (member.password === password) {
          role = 'member';
          redirectUrl = '/member';
          userId = member.id;
        } else {
          return NextResponse.json(
            { success: false, error: 'Invalid password' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 401 }
        );
      }
    }

    // Create session
    const sessionToken = Buffer.from(
      JSON.stringify({
        email: userEmail,
        id: userId,
        role,
        expiresAt: Date.now() + SESSION_DURATION,
      })
    ).toString('base64');

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      role,
      redirectUrl,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

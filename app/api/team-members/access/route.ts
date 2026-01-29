import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// POST /api/team-members/access - Set password for a team member
export async function POST(request: NextRequest) {
    try {
        // 1. Verify Admin (Manager) Session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            const sessionData = JSON.parse(
                Buffer.from(sessionCookie.value, 'base64').toString()
            );
            if (sessionData.role !== 'manager') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // 2. Update Password
        const body = await request.json();
        const { memberId, password } = body;

        if (!memberId || !password) {
            return NextResponse.json(
                { success: false, error: 'Member ID and password are required' },
                { status: 400 }
            );
        }

        // TODO: In production, hash this password with bcrypt
        // const hashedPassword = await hash(password, 10);
        const hashedPassword = password;

        await prisma.teamMember.update({
            where: { id: memberId },
            data: { password: hashedPassword },
        });

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully',
        });

    } catch (error) {
        console.error('Error setting password:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update access settings' },
            { status: 500 }
        );
    }
}

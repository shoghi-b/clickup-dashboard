import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let memberId: string;
        try {
            const sessionData = JSON.parse(
                Buffer.from(sessionCookie.value, 'base64').toString()
            );
            if (sessionData.role !== 'member') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            memberId = sessionData.id;
        } catch (e) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const body = await request.json();
        const { discrepancyId, reason, note } = body;

        if (!discrepancyId || !reason) {
            return NextResponse.json(
                { success: false, error: 'Discrepancy ID and reason are required' },
                { status: 400 }
            );
        }

        // specific validation: ensure discrepancy belongs to member
        const discrepancy = await prisma.discrepancy.findUnique({
            where: { id: discrepancyId },
        });

        if (!discrepancy) {
            return NextResponse.json({ error: 'Discrepancy not found' }, { status: 404 });
        }

        if (discrepancy.teamMemberId !== memberId) {
            return NextResponse.json({ error: 'Unauthorized access to discrepancy' }, { status: 403 });
        }

        await prisma.discrepancy.update({
            where: { id: discrepancyId },
            data: {
                status: 'resolved',
                resolvedReason: reason,
                resolvedNote: note,
                resolvedAt: new Date(),
                resolvedBy: 'SELF_CORRECTION'
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Discrepancy resolved successfully',
        });

    } catch (error) {
        console.error('Error resolving discrepancy:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to resolve discrepancy' },
            { status: 500 }
        );
    }
}

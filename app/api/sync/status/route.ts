import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Fetch last sync timestamps from Configuration table
        const clickupSyncConfig = await prisma.configuration.findUnique({
            where: { key: 'last_sync_clickup' }
        });

        const attendanceSyncConfig = await prisma.configuration.findUnique({
            where: { key: 'last_sync_attendance' }
        });

        return NextResponse.json({
            success: true,
            lastSyncClickUp: clickupSyncConfig?.value
                ? new Date(JSON.parse(clickupSyncConfig.value)).toISOString()
                : null,
            lastSyncAttendance: attendanceSyncConfig?.value
                ? new Date(JSON.parse(attendanceSyncConfig.value)).toISOString()
                : null,
        });
    } catch (error) {
        console.error('Error fetching sync status:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch sync status',
            },
            { status: 500 }
        );
    }
}

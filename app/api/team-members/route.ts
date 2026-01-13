import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const teamMembers = await prisma.teamMember.findMany({
      orderBy: {
        username: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: teamMembers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, expectedHoursPerDay, expectedHoursPerWeek } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Team member ID is required' },
        { status: 400 }
      );
    }

    const updatedMember = await prisma.teamMember.update({
      where: { id },
      data: {
        ...(expectedHoursPerDay !== undefined && { expectedHoursPerDay }),
        ...(expectedHoursPerWeek !== undefined && { expectedHoursPerWeek }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedMember,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


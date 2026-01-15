import { prisma } from '@/lib/prisma';
import { ClickUpClient } from '@/lib/clickup/client';
import { ClickUpTimeEntry, ClickUpTeamMember } from '@/lib/clickup/types';
import { startOfDay, parseISO, isSameDay } from 'date-fns';

// Helper function to check if two dates are the same day in UTC
function isSameDayUTC(date1: Date, date2: Date): boolean {
  return date1.getUTCFullYear() === date2.getUTCFullYear() &&
         date1.getUTCMonth() === date2.getUTCMonth() &&
         date1.getUTCDate() === date2.getUTCDate();
}

export class SyncService {
  private clickupClient: ClickUpClient;
  private teamId: string;
  private spaceCache: Map<string, string> = new Map();
  private listCache: Map<string, string> = new Map();

  constructor(apiToken?: string, teamId?: string) {
    this.clickupClient = new ClickUpClient(apiToken);
    this.teamId = teamId || process.env.CLICKUP_TEAM_ID || '';

    if (!this.teamId) {
      throw new Error('ClickUp Team ID is required');
    }
  }

  async syncTeamMembers(): Promise<{ success: boolean; count: number; error?: string }> {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'TEAM_MEMBERS',
        status: 'PENDING',
        startedAt: new Date(),
      },
    });

    try {
      const response = await this.clickupClient.getTeamMembers(this.teamId);
      const members = response.team.members;

      let count = 0;
      for (const memberWrapper of members) {
        await this.upsertTeamMember(memberWrapper.user);
        count++;
      }

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          recordsProcessed: count,
        },
      });

      return { success: true, count };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage,
        },
      });

      return { success: false, count: 0, error: errorMessage };
    }
  }

  async syncTimeEntries(
    startDate: Date,
    endDate: Date,
    assigneeId?: number
  ): Promise<{ success: boolean; count: number; error?: string }> {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'TIME_ENTRIES',
        status: 'PENDING',
        startedAt: new Date(),
      },
    });

    try {
      let totalCount = 0;

      // If assigneeId is provided, sync for that user only
      if (assigneeId) {
        const count = await this.syncTimeEntriesForUser(startDate, endDate, assigneeId);
        totalCount = count;
      } else {
        // Otherwise, sync for all team members
        const teamMembers = await prisma.teamMember.findMany({
          select: { clickupId: true, username: true },
        });

        console.log(`Syncing time entries for ${teamMembers.length} team members...`);

        for (const member of teamMembers) {
          try {
            const count = await this.syncTimeEntriesForUser(startDate, endDate, member.clickupId);
            totalCount += count;
            console.log(`Synced ${count} entries for ${member.username}`);
          } catch (error) {
            console.error(`Error syncing time entries for ${member.username}:`, error);
            // Continue with other members even if one fails
          }
        }
      }

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          recordsProcessed: totalCount,
        },
      });

      return { success: true, count: totalCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage,
        },
      });

      return { success: false, count: 0, error: errorMessage };
    }
  }

  private async syncTimeEntriesForUser(
    startDate: Date,
    endDate: Date,
    assigneeId: number
  ): Promise<number> {
    const response = await this.clickupClient.getTimeEntries({
      teamId: this.teamId,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      assignee: assigneeId,
    });

    const entries = response.data;
    let count = 0;

    for (const entry of entries) {
      await this.upsertTimeEntry(entry);
      count++;
    }

    return count;
  }

  private async upsertTeamMember(member: ClickUpTeamMember): Promise<void> {
    await prisma.teamMember.upsert({
      where: { clickupId: member.id },
      update: {
        username: member.username,
        email: member.email,
        profilePicture: member.profilePicture,
        role: member.custom_role || member.role?.toString(),
      },
      create: {
        clickupId: member.id,
        username: member.username,
        email: member.email,
        profilePicture: member.profilePicture,
        role: member.custom_role || member.role?.toString(),
      },
    });
  }

  private async getSpaceName(spaceId: string): Promise<string | null> {
    if (!spaceId) return null;

    // Check cache first
    if (this.spaceCache.has(spaceId)) {
      return this.spaceCache.get(spaceId) || null;
    }

    // Fetch from API
    try {
      const space = await this.clickupClient.getSpace(spaceId);
      this.spaceCache.set(spaceId, space.name);
      return space.name;
    } catch (error) {
      console.warn(`Failed to fetch space ${spaceId}:`, error instanceof Error ? error.message : error);
      this.spaceCache.set(spaceId, 'Unknown Space');
      return 'Unknown Space';
    }
  }

  private async getListName(listId: string): Promise<string | null> {
    if (!listId) return null;

    // Check cache first
    if (this.listCache.has(listId)) {
      return this.listCache.get(listId) || null;
    }

    // Fetch from API
    try {
      const list = await this.clickupClient.getList(listId);
      this.listCache.set(listId, list.name);
      return list.name;
    } catch (error) {
      console.warn(`Failed to fetch list ${listId}:`, error instanceof Error ? error.message : error);
      this.listCache.set(listId, 'Unknown List');
      return 'Unknown List';
    }
  }

  private async upsertTimeEntry(entry: ClickUpTimeEntry): Promise<void> {
    // Find the team member
    const teamMember = await prisma.teamMember.findUnique({
      where: { clickupId: entry.user.id },
    });

    if (!teamMember) {
      console.warn(`Team member not found for user ID: ${entry.user.id}`);
      return;
    }

    // Parse timestamps - ClickUp API returns Unix timestamps in milliseconds as strings
    const startDate = new Date(parseInt(entry.start, 10));
    const endDate = entry.end ? new Date(parseInt(entry.end, 10)) : null;
    const loggedAt = new Date(parseInt(entry.at, 10));
    const duration = parseInt(entry.duration, 10);

    // Determine if backfilled (logged after the work day) - use UTC comparison
    const isBackfilled = !isSameDayUTC(startDate, loggedAt);

    // Check if entry exists and if space/list names need updating
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { clickupId: entry.id },
      select: { spaceId: true, spaceName: true, listId: true, listName: true },
    });

    // Fetch space and list names from API since they're not in the time entry response
    // Only fetch if:
    // 1. Entry doesn't exist, OR
    // 2. Space/List ID has changed, OR
    // 3. Space/List name is missing
    let spaceName: string | null = null;
    let listName: string | null = null;

    if (entry.task_location?.space_id) {
      if (!existingEntry ||
          existingEntry.spaceId !== entry.task_location.space_id ||
          !existingEntry.spaceName) {
        spaceName = await this.getSpaceName(entry.task_location.space_id);
      } else {
        spaceName = existingEntry.spaceName;
      }
    }

    if (entry.task_location?.list_id) {
      if (!existingEntry ||
          existingEntry.listId !== entry.task_location.list_id ||
          !existingEntry.listName) {
        listName = await this.getListName(entry.task_location.list_id);
      } else {
        listName = existingEntry.listName;
      }
    }

    await prisma.timeEntry.upsert({
      where: { clickupId: entry.id },
      update: {
        duration,
        startDate,
        endDate,
        taskId: entry.task?.id,
        taskName: entry.task?.name,
        listId: entry.task_location?.list_id,
        listName,
        spaceId: entry.task_location?.space_id,
        spaceName,
        billable: entry.billable,
        tags: JSON.stringify(entry.tags),
        loggedAt,
        isBackfilled,
      },
      create: {
        clickupId: entry.id,
        teamMemberId: teamMember.id,
        duration,
        startDate,
        endDate,
        taskId: entry.task?.id,
        taskName: entry.task?.name,
        listId: entry.task_location?.list_id,
        listName,
        spaceId: entry.task_location?.space_id,
        spaceName,
        billable: entry.billable,
        tags: JSON.stringify(entry.tags),
        loggedAt,
        isBackfilled,
      },
    });
  }
}


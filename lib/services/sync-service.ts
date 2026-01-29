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

      // Parallelize upserts
      await Promise.all(members.map(memberWrapper => this.upsertTeamMember(memberWrapper.user)));

      const count = members.length;

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

      // Pre-fetch all team members to avoid individual DB calls
      const allTeamMembers = await prisma.teamMember.findMany();
      const teamMemberMap = new Map(allTeamMembers.map(tm => [tm.clickupId, tm]));

      // If assigneeId is provided, sync for that user only
      if (assigneeId) {
        // Optimized single user sync
        totalCount = await this.syncTimeEntriesForUserOptimized(startDate, endDate, assigneeId, teamMemberMap);
      } else {
        // Otherwise, sync for all team members
        const teamMembers = allTeamMembers; // Use the pre-fetched list

        console.log(`Syncing time entries for ${teamMembers.length} team members...`);

        // Process users sequentially but each user's entries are bulk inserted
        // (Parallel users might hit API rate limits)
        for (const member of teamMembers) {
          try {
            const count = await this.syncTimeEntriesForUserOptimized(startDate, endDate, member.clickupId, teamMemberMap);
            totalCount += count;
            console.log(`Synced ${count} entries for ${member.username}`);
          } catch (error) {
            console.error(`Error syncing time entries for ${member.username}:`, error);
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

  // Optimized version with bulk processing
  private async syncTimeEntriesForUserOptimized(
    startDate: Date,
    endDate: Date,
    assigneeId: number,
    teamMemberMap: Map<number, any>
  ): Promise<number> {
    const response = await this.clickupClient.getTimeEntries({
      teamId: this.teamId,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      assignee: assigneeId,
    });

    const entries = response.data;
    if (entries.length === 0) return 0;

    const teamMember = teamMemberMap.get(assigneeId);
    if (!teamMember) {
      console.warn(`Team member not found for user ID: ${assigneeId}`);
      return 0;
    }

    // 1. Collect all unique Space and List IDs to resolve names in bulk/parallel
    const spaceIds = new Set<string>();
    const listIds = new Set<string>();

    entries.forEach(entry => {
      if (entry.task_location?.space_id) spaceIds.add(entry.task_location.space_id);
      if (entry.task_location?.list_id) listIds.add(entry.task_location.list_id);
    });

    // 2. Resolve names (populate cache)
    await Promise.all(Array.from(spaceIds).map(id => this.getSpaceName(id)));
    await Promise.all(Array.from(listIds).map(id => this.getListName(id)));

    // 3. Prepare data for bulk insert
    const prepareData = (entry: ClickUpTimeEntry) => {
      // Parse timestamps
      const start = new Date(parseInt(entry.start, 10));
      const end = entry.end ? new Date(parseInt(entry.end, 10)) : null;
      const at = new Date(parseInt(entry.at, 10));
      const dur = parseInt(entry.duration, 10);
      const isBackfilled = !isSameDayUTC(start, at);

      const spaceId = entry.task_location?.space_id;
      const listId = entry.task_location?.list_id;
      const spaceName = spaceId ? this.spaceCache.get(spaceId) || null : null;
      const listName = listId ? this.listCache.get(listId) || null : null;

      return {
        clickupId: entry.id,
        teamMemberId: teamMember.id,
        duration: dur,
        startDate: start,
        endDate: end,
        taskId: entry.task?.id,
        taskName: entry.task?.name,
        listId: listId,
        listName,
        spaceId: spaceId,
        spaceName,
        billable: entry.billable,
        tags: JSON.stringify(entry.tags),
        loggedAt: at,
        isBackfilled,
      };
    };

    const records = entries.map(prepareData);

    // 4. Bulk Insert (Use createMany with skipDuplicates for speed)
    // Note: detailed updates to existing records (e.g. name changes) won't happen here, 
    // but for sync speed on initial load, this is best.
    await prisma.timeEntry.createMany({
      data: records,
      skipDuplicates: true,
    });

    return records.length;
  }

  // Legacy method kept if single upsert is needed elsewhere, but mostly unused now
  private async upsertTimeEntry(entry: ClickUpTimeEntry): Promise<void> {
    // ... implementation ...
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
    if (this.spaceCache.has(spaceId)) return this.spaceCache.get(spaceId) || null;
    try {
      const space = await this.clickupClient.getSpace(spaceId);
      this.spaceCache.set(spaceId, space.name);
      return space.name;
    } catch {
      this.spaceCache.set(spaceId, 'Unknown Space');
      return 'Unknown Space';
    }
  }

  private async getListName(listId: string): Promise<string | null> {
    if (!listId) return null;
    if (this.listCache.has(listId)) return this.listCache.get(listId) || null;
    try {
      const list = await this.clickupClient.getList(listId);
      this.listCache.set(listId, list.name);
      return list.name;
    } catch {
      this.listCache.set(listId, 'Unknown List');
      return 'Unknown List';
    }
  }
}


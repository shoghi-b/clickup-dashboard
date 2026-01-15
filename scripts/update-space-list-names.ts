import { config } from 'dotenv';
import { prisma } from '../lib/prisma';
import { ClickUpClient } from '../lib/clickup/client';

// Load environment variables
config();

async function updateSpaceListNames() {
  try {
    console.log('🔄 Updating Space and List names for existing time entries...\n');

    const client = new ClickUpClient();
    const teamId = process.env.CLICKUP_TEAM_ID || '';

    if (!teamId) {
      console.error('❌ CLICKUP_TEAM_ID not found in environment');
      process.exit(1);
    }

    // Get all team members
    const teamMembers = await prisma.teamMember.findMany({
      select: { clickupId: true, username: true },
    });

    console.log(`Found ${teamMembers.length} team members\n`);

    // Get date range from existing time entries
    const oldestEntry = await prisma.timeEntry.findFirst({
      orderBy: { startDate: 'asc' },
      select: { startDate: true },
    });

    const newestEntry = await prisma.timeEntry.findFirst({
      orderBy: { startDate: 'desc' },
      select: { startDate: true },
    });

    if (!oldestEntry || !newestEntry) {
      console.log('No time entries found in database');
      return;
    }

    const startDate = oldestEntry.startDate;
    const endDate = newestEntry.startDate;

    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);

    let totalUpdated = 0;
    let totalProcessed = 0;

    for (const member of teamMembers) {
      console.log(`Processing ${member.username}...`);

      try {
        const response = await client.getTimeEntries({
          teamId,
          startDate: startDate.getTime(),
          endDate: endDate.getTime(),
          assignee: member.clickupId,
        });

        console.log(`  Found ${response.data.length} entries from API`);

        for (const entry of response.data) {
          totalProcessed++;

          // Update the entry with space and list names
          const updated = await prisma.timeEntry.updateMany({
            where: { clickupId: entry.id },
            data: {
              spaceName: entry.task_location?.space_name || null,
              spaceId: entry.task_location?.space_id || null,
              listName: entry.task_location?.list_name || null,
              listId: entry.task_location?.list_id || null,
            },
          });

          if (updated.count > 0) {
            totalUpdated++;
          }
        }

        console.log(`  ✓ Updated ${totalUpdated} entries so far\n`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`  ✗ Error processing ${member.username}:`, error);
      }
    }

    console.log('\n✅ Update complete!');
    console.log(`Total entries processed: ${totalProcessed}`);
    console.log(`Total entries updated: ${totalUpdated}`);

    // Verify the update
    const withSpace = await prisma.timeEntry.count({
      where: { spaceName: { not: null } },
    });

    const withList = await prisma.timeEntry.count({
      where: { listName: { not: null } },
    });

    const total = await prisma.timeEntry.count();

    console.log('\n📊 Final Statistics:');
    console.log(`  Entries with Space name: ${withSpace} / ${total} (${((withSpace / total) * 100).toFixed(1)}%)`);
    console.log(`  Entries with List name: ${withList} / ${total} (${((withList / total) * 100).toFixed(1)}%)`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateSpaceListNames();


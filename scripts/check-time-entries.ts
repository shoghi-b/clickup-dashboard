import { config } from 'dotenv';
import { prisma } from '../lib/prisma';

config();

async function checkTimeEntries() {
  try {
    const totalCount = await prisma.timeEntry.count();
    console.log(`\nTotal time entries: ${totalCount}\n`);

    if (totalCount > 0) {
      // Get sample entries
      const sampleEntries = await prisma.timeEntry.findMany({
        take: 10,
        orderBy: { startDate: 'desc' },
        include: {
          teamMember: {
            select: {
              username: true,
            },
          },
        },
      });

      console.log('📋 Sample Time Entries:\n');
      sampleEntries.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.teamMember.username}`);
        console.log(`   Task: ${entry.taskName || 'N/A'}`);
        console.log(`   List: ${entry.listName || 'NULL'} (ID: ${entry.listId || 'NULL'})`);
        console.log(`   Space: ${entry.spaceName || 'NULL'} (ID: ${entry.spaceId || 'NULL'})`);
        console.log(`   Duration: ${(entry.duration / (1000 * 60 * 60)).toFixed(2)}h`);
        console.log(`   Date: ${entry.startDate.toISOString().split('T')[0]}`);
        console.log('');
      });

      // Statistics
      const withSpace = await prisma.timeEntry.count({
        where: { spaceName: { not: null } },
      });

      const withList = await prisma.timeEntry.count({
        where: { listName: { not: null } },
      });

      const withoutSpace = await prisma.timeEntry.count({
        where: { spaceName: null },
      });

      const withoutList = await prisma.timeEntry.count({
        where: { listName: null },
      });

      console.log('📊 Statistics:');
      console.log(`   Entries with Space info: ${withSpace} / ${totalCount} (${((withSpace / totalCount) * 100).toFixed(1)}%)`);
      console.log(`   Entries with List info: ${withList} / ${totalCount} (${((withList / totalCount) * 100).toFixed(1)}%)`);
      console.log(`   Entries without Space info: ${withoutSpace}`);
      console.log(`   Entries without List info: ${withoutList}`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkTimeEntries();


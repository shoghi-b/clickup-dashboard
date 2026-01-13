import { config } from 'dotenv';
import { prisma } from '../lib/prisma';

// Load environment variables
config();

async function cleanupDuplicates() {
  console.log('Cleaning up duplicate daily summaries...\n');

  // Find all daily summaries that are NOT at midnight UTC
  const nonUTCMidnight = await prisma.dailySummary.findMany({
    where: {
      NOT: {
        date: {
          // This will match dates where the time component is NOT 00:00:00.000
          // We'll check this in code instead
        },
      },
    },
  });

  const toDelete: string[] = [];

  for (const summary of nonUTCMidnight) {
    const hours = summary.date.getUTCHours();
    const minutes = summary.date.getUTCMinutes();
    const seconds = summary.date.getUTCSeconds();
    const milliseconds = summary.date.getUTCMilliseconds();

    // If it's not at UTC midnight, mark for deletion
    if (hours !== 0 || minutes !== 0 || seconds !== 0 || milliseconds !== 0) {
      toDelete.push(summary.id);
      console.log(`Marking for deletion: ${summary.id} - Date: ${summary.date.toISOString()}`);
    }
  }

  if (toDelete.length === 0) {
    console.log('✅ No non-UTC-midnight records found!\n');
  } else {
    console.log(`\n⚠️  Found ${toDelete.length} records to delete\n`);
    console.log('Deleting in batches...');

    // Delete in batches of 100 to avoid query parameter limit
    const batchSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      const result = await prisma.dailySummary.deleteMany({
        where: {
          id: {
            in: batch,
          },
        },
      });
      totalDeleted += result.count;
      console.log(`  Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toDelete.length / batchSize)} (${result.count} records)`);
    }

    console.log(`✅ Deleted ${totalDeleted} records total\n`);
  }

  // Also clean up weekly summaries if needed
  console.log('Checking weekly summaries...\n');

  const weeklySummaries = await prisma.weeklySummary.findMany();
  const weeklyToDelete: string[] = [];

  for (const summary of weeklySummaries) {
    const hours = summary.weekStartDate.getUTCHours();
    const minutes = summary.weekStartDate.getUTCMinutes();

    if (hours !== 0 || minutes !== 0) {
      weeklyToDelete.push(summary.id);
      console.log(`Marking weekly summary for deletion: ${summary.id} - Start: ${summary.weekStartDate.toISOString()}`);
    }
  }

  if (weeklyToDelete.length === 0) {
    console.log('✅ No non-UTC weekly records found!\n');
  } else {
    console.log(`\n⚠️  Found ${weeklyToDelete.length} weekly records to delete\n`);
    console.log('Deleting in batches...');

    // Delete in batches of 100
    const batchSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < weeklyToDelete.length; i += batchSize) {
      const batch = weeklyToDelete.slice(i, i + batchSize);
      const result = await prisma.weeklySummary.deleteMany({
        where: {
          id: {
            in: batch,
          },
        },
      });
      totalDeleted += result.count;
      console.log(`  Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(weeklyToDelete.length / batchSize)} (${result.count} records)`);
    }

    console.log(`✅ Deleted ${totalDeleted} weekly records total\n`);
  }

  await prisma.$disconnect();
}

cleanupDuplicates().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});


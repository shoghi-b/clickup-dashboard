import { config } from 'dotenv';
import { prisma } from '../lib/prisma';

// Load environment variables
config();

async function resetDatabase() {
  console.log('🗑️  Resetting Database...\n');
  console.log('⚠️  WARNING: This will delete ALL data from the database!\n');

  try {
    // Delete in correct order to respect foreign key constraints
    console.log('1️⃣  Deleting sync logs...');
    const syncLogs = await prisma.syncLog.deleteMany({});
    console.log(`   ✓ Deleted ${syncLogs.count} sync logs\n`);

    console.log('2️⃣  Deleting daily summaries...');
    const dailySummaries = await prisma.dailySummary.deleteMany({});
    console.log(`   ✓ Deleted ${dailySummaries.count} daily summaries\n`);

    console.log('3️⃣  Deleting weekly summaries...');
    const weeklySummaries = await prisma.weeklySummary.deleteMany({});
    console.log(`   ✓ Deleted ${weeklySummaries.count} weekly summaries\n`);

    console.log('4️⃣  Deleting time entries...');
    const timeEntries = await prisma.timeEntry.deleteMany({});
    console.log(`   ✓ Deleted ${timeEntries.count} time entries\n`);

    console.log('5️⃣  Deleting team members...');
    const teamMembers = await prisma.teamMember.deleteMany({});
    console.log(`   ✓ Deleted ${teamMembers.count} team members\n`);

    console.log('6️⃣  Deleting configuration...');
    const config = await prisma.configuration.deleteMany({});
    console.log(`   ✓ Deleted ${config.count} configuration entries\n`);

    // Verify database is empty
    console.log('7️⃣  Verifying database is empty...');
    const counts = {
      teamMembers: await prisma.teamMember.count(),
      timeEntries: await prisma.timeEntry.count(),
      dailySummaries: await prisma.dailySummary.count(),
      weeklySummaries: await prisma.weeklySummary.count(),
      syncLogs: await prisma.syncLog.count(),
      configuration: await prisma.configuration.count(),
    };

    const isEmpty = Object.values(counts).every(count => count === 0);

    if (isEmpty) {
      console.log('   ✅ Database is completely empty\n');
    } else {
      console.log('   ⚠️  Database still has some records:');
      console.log('   ', counts);
      console.log('');
    }

    console.log('=' .repeat(60));
    console.log('✅ DATABASE RESET COMPLETE');
    console.log('=' .repeat(60));
    console.log('\n📝 Next Steps:');
    console.log('   1. Start your Next.js development server:');
    console.log('      npm run dev');
    console.log('');
    console.log('   2. Open the dashboard in your browser:');
    console.log('      http://localhost:3000');
    console.log('');
    console.log('   3. Click the "Sync Data" button to sync from ClickUp');
    console.log('');
    console.log('   OR run the sync script directly:');
    console.log('      npx tsx scripts/sync-data.ts');
    console.log('');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

resetDatabase()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


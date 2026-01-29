import 'dotenv/config';
import { SyncService } from '../lib/services/sync-service';
import { subDays } from 'date-fns';

// Load environment variables
// Environment variables loaded via import 'dotenv/config'

async function syncData() {
  console.log('Starting ClickUp data sync...\n');

  const syncService = new SyncService();

  // Step 1: Sync team members
  console.log('=== Step 1: Syncing team members ===');
  const teamMembersResult = await syncService.syncTeamMembers();

  if (teamMembersResult.success) {
    console.log(`✓ Successfully synced ${teamMembersResult.count} team members\n`);
  } else {
    console.error(`✗ Failed to sync team members: ${teamMembersResult.error}\n`);
    process.exit(1);
  }

  // Step 2: Sync time entries for the last 30 days
  console.log('=== Step 2: Syncing time entries (last 30 days) ===');
  const endDate = new Date();
  const startDate = subDays(endDate, 30);

  console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  const timeEntriesResult = await syncService.syncTimeEntries(startDate, endDate);

  if (timeEntriesResult.success) {
    console.log(`✓ Successfully synced ${timeEntriesResult.count} time entries\n`);
  } else {
    console.error(`✗ Failed to sync time entries: ${timeEntriesResult.error}\n`);
    process.exit(1);
  }

  console.log('=== Sync completed successfully! ===');
}

syncData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


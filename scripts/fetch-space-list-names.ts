import { config } from 'dotenv';
import { prisma } from '../lib/prisma';
import { ClickUpClient } from '../lib/clickup/client';

// Load environment variables
config();

interface CacheEntry {
  name: string;
}

async function fetchSpaceListNames() {
  try {
    console.log('🔄 Fetching Space and List names from ClickUp API...\n');

    const client = new ClickUpClient();

    // Caches to avoid duplicate API calls
    const spaceCache = new Map<string, CacheEntry>();
    const listCache = new Map<string, CacheEntry>();

    // Get all unique space IDs and list IDs from time entries
    const uniqueSpaces = await prisma.timeEntry.findMany({
      where: { spaceId: { not: null } },
      select: { spaceId: true },
      distinct: ['spaceId'],
    });

    const uniqueLists = await prisma.timeEntry.findMany({
      where: { listId: { not: null } },
      select: { listId: true },
      distinct: ['listId'],
    });

    console.log(`Found ${uniqueSpaces.length} unique spaces`);
    console.log(`Found ${uniqueLists.length} unique lists\n`);

    // Fetch space names
    console.log('📍 Fetching space names...');
    for (const { spaceId } of uniqueSpaces) {
      if (!spaceId) continue;

      try {
        const space = await client.getSpace(spaceId);
        spaceCache.set(spaceId, { name: space.name });
        console.log(`  ✓ ${space.name} (${spaceId})`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`  ✗ Error fetching space ${spaceId}:`, error instanceof Error ? error.message : error);
        spaceCache.set(spaceId, { name: 'Unknown Space' });
      }
    }

    // Fetch list names
    console.log('\n📋 Fetching list names...');
    for (const { listId } of uniqueLists) {
      if (!listId) continue;

      try {
        const list = await client.getList(listId);
        listCache.set(listId, { name: list.name });
        console.log(`  ✓ ${list.name} (${listId})`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`  ✗ Error fetching list ${listId}:`, error instanceof Error ? error.message : error);
        listCache.set(listId, { name: 'Unknown List' });
      }
    }

    // Update time entries with the fetched names
    console.log('\n💾 Updating time entries...');
    let updatedCount = 0;

    for (const [spaceId, { name }] of spaceCache.entries()) {
      const result = await prisma.timeEntry.updateMany({
        where: { spaceId },
        data: { spaceName: name },
      });
      updatedCount += result.count;
      console.log(`  Updated ${result.count} entries with space: ${name}`);
    }

    for (const [listId, { name }] of listCache.entries()) {
      const result = await prisma.timeEntry.updateMany({
        where: { listId },
        data: { listName: name },
      });
      console.log(`  Updated ${result.count} entries with list: ${name}`);
    }

    console.log(`\n✅ Update complete! Updated ${updatedCount} entries`);

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

fetchSpaceListNames();


import { config } from 'dotenv';
import { prisma } from '../lib/prisma';
import { ClickUpClient } from '../lib/clickup/client';

// Load environment variables
config();

async function debugAPIResponse() {
  try {
    console.log('🔍 Debugging ClickUp API Response...\n');

    const client = new ClickUpClient();
    const teamId = process.env.CLICKUP_TEAM_ID || '';

    // Get Atharva's info
    const atharva = await prisma.teamMember.findFirst({
      where: { username: { contains: 'Atharva' } },
    });

    if (!atharva) {
      console.error('Atharva not found');
      process.exit(1);
    }

    console.log(`Testing with: ${atharva.username} (ID: ${atharva.clickupId})\n`);

    // Get recent entries
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);

    const response = await client.getTimeEntries({
      teamId,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      assignee: atharva.clickupId,
    });

    console.log(`Found ${response.data.length} entries\n`);

    if (response.data.length > 0) {
      const entry = response.data[0];
      
      console.log('=== FULL API RESPONSE FOR FIRST ENTRY ===\n');
      console.log(JSON.stringify(entry, null, 2));
      
      console.log('\n=== TASK_LOCATION FIELD ===\n');
      console.log('task_location:', entry.task_location);
      console.log('Type:', typeof entry.task_location);
      
      if (entry.task_location) {
        console.log('\nKeys:', Object.keys(entry.task_location));
        console.log('\nValues:');
        for (const [key, value] of Object.entries(entry.task_location)) {
          console.log(`  ${key}: ${value} (type: ${typeof value})`);
        }
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

debugAPIResponse();


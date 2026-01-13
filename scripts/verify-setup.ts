/**
 * Setup Verification Script
 * Verifies that the environment is properly configured
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

config();

async function verifySetup() {
  console.log('🔍 Verifying ClickUp Dashboard Setup...\n');

  let hasErrors = false;

  // Check environment variables
  console.log('1️⃣ Checking environment variables...');
  if (!process.env.CLICKUP_API_TOKEN) {
    console.error('   ❌ CLICKUP_API_TOKEN is not set');
    hasErrors = true;
  } else {
    console.log('   ✅ CLICKUP_API_TOKEN is set');
  }

  if (!process.env.CLICKUP_TEAM_ID) {
    console.error('   ❌ CLICKUP_TEAM_ID is not set');
    hasErrors = true;
  } else {
    console.log('   ✅ CLICKUP_TEAM_ID is set');
  }

  // Check database file
  console.log('\n2️⃣ Checking database...');
  const dbPath = join(process.cwd(), 'prisma', 'dev.db');
  if (!existsSync(dbPath)) {
    console.error('   ❌ Database file not found. Run: npx prisma migrate dev');
    hasErrors = true;
  } else {
    console.log('   ✅ Database file exists');
  }

  // Check Prisma client
  console.log('\n3️⃣ Checking Prisma client...');
  try {
    const { prisma } = await import('../lib/prisma');
    await prisma.$connect();
    console.log('   ✅ Prisma client connected successfully');
    await prisma.$disconnect();
  } catch (error) {
    console.error('   ❌ Prisma client error:', error instanceof Error ? error.message : error);
    console.error('   Run: npx prisma generate');
    hasErrors = true;
  }

  // Check ClickUp API connection
  console.log('\n4️⃣ Checking ClickUp API connection...');
  try {
    const response = await fetch('https://api.clickup.com/api/v2/team', {
      headers: {
        'Authorization': process.env.CLICKUP_API_TOKEN || '',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ ClickUp API connection successful');
      console.log(`   📊 Found ${data.teams?.length || 0} team(s)`);
    } else {
      console.error('   ❌ ClickUp API error:', response.status, response.statusText);
      hasErrors = true;
    }
  } catch (error) {
    console.error('   ❌ Failed to connect to ClickUp API:', error instanceof Error ? error.message : error);
    hasErrors = true;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ Setup verification failed. Please fix the errors above.');
    process.exit(1);
  } else {
    console.log('✅ Setup verification passed! You\'re ready to go.');
    console.log('\nNext steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Open: http://localhost:3000');
    console.log('  3. Click "Sync Data" to fetch your timesheet data');
  }
}

verifySetup().catch(console.error);


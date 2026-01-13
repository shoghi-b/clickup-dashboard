import { config } from 'dotenv';
import { AnalyticsService } from '../lib/services/analytics-service';
import { subDays } from 'date-fns';

// Load environment variables
config();

async function calculateAnalytics() {
  console.log('Calculating analytics summaries...\n');

  const analyticsService = new AnalyticsService();

  // Calculate for the last 30 days
  const endDate = new Date();
  const startDate = subDays(endDate, 30);

  console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);
  console.log('This may take a few moments...\n');

  await analyticsService.recalculateAllSummaries(startDate, endDate);

  console.log('✓ Analytics calculation completed successfully!');
}

calculateAnalytics().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});


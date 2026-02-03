
import 'dotenv/config';
import { fetchAttendanceData } from '@/lib/services/attendance-api';
import { addDays } from 'date-fns';

async function main() {
    // Target Feb 2nd
    // In local time (IST), Feb 2nd 00:00
    const start = new Date('2026-02-02');

    // Simulate the fix: End Date + 1 Day
    const end = addDays(new Date('2026-02-02'), 1);

    console.log('Testing Fetch...');
    console.log(`Start Object: ${start.toString()}`);
    console.log(`End Object: ${end.toString()}`);

    try {
        const data = await fetchAttendanceData(start, end);
        console.log(`Fetched ${data.length} punches.`);

        // Filter for Shoghi
        const shoghiPunches = data.filter(p => p.Empcode === '8');
        console.log(`Shoghi Punches: ${shoghiPunches.length}`);
        console.log(JSON.stringify(shoghiPunches, null, 2));

    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

main();

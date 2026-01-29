// Quick test to see if attendance parsing works
import { parseAttendanceFile } from './lib/services/attendance-parser';
import { readFileSync } from 'fs';

const filePath = './monthinout280120261125554.xls';

try {
    console.log('Testing attendance parser...\n');

    const buffer = readFileSync(filePath);
    const result = parseAttendanceFile(buffer, {
        start: new Date('2026-01-01'),
        end: new Date('2026-01-31')
    });

    console.log('✅ Parsing successful!');
    console.log(`Total records: ${result.totalRecords}`);
    console.log(`Employees: ${result.employees.size}`);
    console.log(`Date range: ${result.dateRange.start} to ${result.dateRange.end}\n`);

    // Check first entry
    const firstEmployee = Array.from(result.employees.entries())[0];
    if (firstEmployee) {
        const [name, entries] = firstEmployee;
        console.log(`Sample employee: ${name}`);
        console.log(`Entries: ${entries.length}`);

        if (entries[0]) {
            const entry = entries[0];
            console.log(`\nFirst entry:`);
            console.log(`  Date: ${entry.date}`);
            console.log(`  IN/OUT Periods: ${JSON.stringify(entry.inOutPeriods)}`);
            console.log(`  First IN: ${entry.firstIn}`);
            console.log(`  Last OUT: ${entry.lastOut}`);
        }
    }
} catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
    }
}

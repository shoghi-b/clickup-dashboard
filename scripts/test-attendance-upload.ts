import * as fs from 'fs';
import * as path from 'path';
import { parseAttendanceFile } from '../lib/services/attendance-parser';

const filePath = path.join(process.cwd(), 'monthinout13012026134245.xls');

try {
  console.log('📁 Reading file:', filePath);
  const buffer = fs.readFileSync(filePath);
  
  console.log('📊 Parsing attendance data...\n');
  
  // Test without date range
  const parsedData = parseAttendanceFile(buffer);
  
  console.log('✅ Parsing successful!\n');
  console.log('📈 Summary:');
  console.log('  Total Records:', parsedData.totalRecords);
  console.log('  Total Employees:', parsedData.employees.size);
  console.log('  Date Range:', parsedData.dateRange.start.toLocaleDateString(), '-', parsedData.dateRange.end.toLocaleDateString());
  
  console.log('\n👥 Employees:');
  for (const [name, entries] of parsedData.employees) {
    const presentCount = entries.filter(e => e.status === 'PRESENT').length;
    const absentCount = entries.filter(e => e.status === 'ABSENT').length;
    const partialCount = entries.filter(e => e.status === 'PARTIAL').length;
    const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
    
    console.log(`\n  ${name} (Code: ${entries[0].employeeCode || 'N/A'})`);
    console.log(`    Total Days: ${entries.length}`);
    console.log(`    Present: ${presentCount}, Absent: ${absentCount}, Partial: ${partialCount}`);
    console.log(`    Total Hours: ${totalHours.toFixed(2)}h`);
    console.log(`    Avg Hours/Day: ${(totalHours / presentCount).toFixed(2)}h`);
  }
  
  console.log('\n📋 Sample Records (first 5):');
  let count = 0;
  for (const [name, entries] of parsedData.employees) {
    for (const entry of entries.slice(0, 5)) {
      console.log(`\n  ${entry.employeeName} - ${entry.date.toLocaleDateString()}`);
      console.log(`    IN: ${entry.firstIn || '--:--'}, OUT: ${entry.lastOut || '--:--'}`);
      console.log(`    Hours: ${entry.totalHours.toFixed(2)}h, Status: ${entry.status}`);
      count++;
      if (count >= 5) break;
    }
    if (count >= 5) break;
  }
  
  // Test with date range
  console.log('\n\n🗓️  Testing with date range filter (Jan 6-10, 2026)...');
  const filteredData = parseAttendanceFile(buffer, {
    start: new Date(2026, 0, 6),
    end: new Date(2026, 0, 10)
  });
  
  console.log('  Filtered Records:', filteredData.totalRecords);
  console.log('  Date Range:', filteredData.dateRange.start.toLocaleDateString(), '-', filteredData.dateRange.end.toLocaleDateString());
  
} catch (error) {
  console.error('❌ Error:', error);
  if (error instanceof Error) {
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  }
}


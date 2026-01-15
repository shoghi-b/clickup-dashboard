import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'monthinout13012026134245.xls');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  console.log('Sheet Name:', sheetName);
  console.log('\nTotal rows:', data.length);

  // Find rows with specific keywords
  console.log('\n\nSearching for key rows:');
  for (let i = 0; i < Math.min(50, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const rowStr = JSON.stringify(row);
    if (rowStr.includes('Empcode') || rowStr.includes('Name') || rowStr.includes('Date') || rowStr.includes('IN')) {
      console.log(`\nRow ${i}:`, row);
    }
  }

  console.log('\n\nFirst 30 rows:');
  for (let i = 0; i < Math.min(30, data.length); i++) {
    console.log(`Row ${i}:`, data[i]);
  }

} catch (error) {
  console.error('Error reading file:', error);
}


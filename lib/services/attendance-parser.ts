import * as XLSX from 'xlsx';

export interface AttendanceEntry {
  employeeName: string;
  employeeCode: string | null;
  date: Date;
  firstIn: string | null;
  lastOut: string | null;
  totalHours: number;
  status: 'PRESENT' | 'ABSENT' | 'PARTIAL';
  shift: string | null;
  workPlusOT: string | null;
}

export interface ParsedAttendanceData {
  employees: Map<string, AttendanceEntry[]>; // Map of employee name to their attendance entries
  dateRange: { start: Date; end: Date };
  totalRecords: number;
}

/**
 * Parse time string (HH:mm) to minutes
 */
function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr || timeStr === '--:--' || timeStr === '00:00') {
    return null;
  }
  
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) return null;
  
  return hours * 60 + minutes;
}

/**
 * Calculate hours between two time strings
 */
function calculateHours(inTime: string | null, outTime: string | null): number {
  const inMinutes = parseTimeToMinutes(inTime);
  const outMinutes = parseTimeToMinutes(outTime);
  
  if (inMinutes === null || outMinutes === null) {
    return 0;
  }
  
  let diff = outMinutes - inMinutes;
  
  // Handle case where out time is next day (e.g., in at 23:00, out at 01:00)
  if (diff < 0) {
    diff += 24 * 60; // Add 24 hours in minutes
  }
  
  return diff / 60; // Convert to hours
}

/**
 * Parse date string (DD/MM/YYYY) to Date object
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  return new Date(year, month, day);
}

/**
 * Determine attendance status
 */
function determineStatus(firstIn: string | null, lastOut: string | null, totalHours: number): 'PRESENT' | 'ABSENT' | 'PARTIAL' {
  if (!firstIn || firstIn === '--:--') {
    return 'ABSENT';
  }
  
  if (!lastOut || lastOut === '--:--') {
    return 'PARTIAL'; // Came in but no out time
  }
  
  if (totalHours < 4) {
    return 'PARTIAL'; // Less than 4 hours considered partial
  }
  
  return 'PRESENT';
}

/**
 * Parse attendance XLS file
 */
export function parseAttendanceFile(buffer: Buffer, selectedDateRange?: { start: Date; end: Date }): ParsedAttendanceData {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  const employees = new Map<string, AttendanceEntry[]>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  let totalRecords = 0;
  
  let currentEmployee: { name: string; code: string | null } | null = null;
  let headerRowIndex = -1;
  
  // Parse the file
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row || row.length === 0) continue;

    // Convert row to string array, handling undefined/null values
    const rowValues = row.map((cell: any) => cell !== undefined && cell !== null ? String(cell) : '');

    // Check if this is an employee header row (contains "Empcode" and "Name")
    const hasEmpcode = rowValues.some(cell => cell === 'Empcode');
    const hasName = rowValues.some(cell => cell === 'Name');

    if (hasEmpcode && hasName) {
      const empCodeIndex = rowValues.indexOf('Empcode');
      const nameIndex = rowValues.indexOf('Name');

      // Find the actual values (next non-empty cell after the label)
      let empCode = null;
      let empName = null;

      for (let j = empCodeIndex + 1; j < rowValues.length; j++) {
        if (rowValues[j] && rowValues[j] !== '' && !empCode) {
          empCode = rowValues[j];
          break;
        }
      }

      for (let j = nameIndex + 1; j < rowValues.length; j++) {
        if (rowValues[j] && rowValues[j] !== '' && !empName) {
          empName = rowValues[j];
          break;
        }
      }

      if (empName) {
        currentEmployee = {
          name: empName.trim(),
          code: empCode ? empCode.trim() : null
        };
      }
      continue;
    }

    // Check if this is the data header row (contains "Date", "IN", "Out")
    const hasDate = rowValues.some(cell => cell === 'Date');
    const hasIN = rowValues.some(cell => cell === 'IN');
    const hasOut = rowValues.some(cell => cell === 'Out');

    if (hasDate && hasIN && hasOut) {
      headerRowIndex = i;
      continue;
    }

    // Parse data rows (after header and with current employee set)
    if (currentEmployee && headerRowIndex !== -1 && i > headerRowIndex) {
      const dateStr = rowValues[0];
      const shift = rowValues[1];
      const firstIn = rowValues[2];
      const lastOut = rowValues[17]; // Column 17 is "Out" (last out)
      const workPlusOT = rowValues[18];

      // Parse date
      const date = parseDate(dateStr);
      if (!date) continue;
      
      // Check if date is within selected range
      if (selectedDateRange) {
        if (date < selectedDateRange.start || date > selectedDateRange.end) {
          continue; // Skip dates outside selected range
        }
      }
      
      // Calculate total hours
      const totalHours = calculateHours(firstIn, lastOut);
      
      // Determine status
      const status = determineStatus(firstIn, lastOut, totalHours);
      
      const entry: AttendanceEntry = {
        employeeName: currentEmployee.name,
        employeeCode: currentEmployee.code,
        date,
        firstIn: firstIn && firstIn !== '--:--' ? String(firstIn) : null,
        lastOut: lastOut && lastOut !== '--:--' ? String(lastOut) : null,
        totalHours,
        status,
        shift: shift ? String(shift) : null,
        workPlusOT: workPlusOT ? String(workPlusOT) : null
      };
      
      // Add to employees map
      if (!employees.has(currentEmployee.name)) {
        employees.set(currentEmployee.name, []);
      }
      employees.get(currentEmployee.name)!.push(entry);
      
      // Track date range
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
      
      totalRecords++;
    }
  }
  
  return {
    employees,
    dateRange: {
      start: minDate || new Date(),
      end: maxDate || new Date()
    },
    totalRecords
  };
}


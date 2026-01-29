
import { format } from 'date-fns';

const API_BASE_URL = 'https://api.etimeoffice.com/api';

// Basic Auth Credentials
// Note: In production, these should be properly encoded if they contain special characters.
// The password field is empty as per requirements.
const USERNAME = process.env.ATTENDANCE_API_USERNAME || 'tcules:tcules:tcules@123#:true';
const PASSWORD = process.env.ATTENDANCE_API_PASSWORD || '';

interface PunchData {
    Name: string;
    Empcode: string;
    PunchDate: string; // Format: "dd/MM/yyyy HH:mm:ss"
    M_Flag: null | string;
    mcid: string; // "1" for IN, "2" for OUT
}

interface ApiResponse {
    Error: boolean;
    Msg: string;
    IsAdmin: boolean;
    PunchData: PunchData[];
}

export interface AttendanceEntry {
    employeeName: string;
    employeeCode: string;
    date: Date;
    inOutPeriods: { in: string; out: string }[];
    firstIn: string | null;
    lastOut: string | null;
    totalHours: number;
    status: 'PRESENT' | 'ABSENT' | 'PARTIAL';
    shift: string | null;
    workPlusOT: string | null;
}

/**
 * Fetch punch data from the external API
 */
export async function fetchAttendanceData(startDate: Date, endDate: Date): Promise<PunchData[]> {
    const fromDateStr = format(startDate, 'dd/MM/yyyy_HH:mm');
    const toDateStr = format(endDate, 'dd/MM/yyyy_HH:mm');

    // Construct URL with query params
    const url = `${API_BASE_URL}/DownloadPunchDataMCID?Empcode=ALL&FromDate=${fromDateStr}&ToDate=${toDateStr}`;

    console.log(`Fetching attendance data from: ${url}`);

    // Create Basic Auth header
    const authString = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

    const response = await fetch(url, {
        headers: {
            'Authorization': `Basic ${authString}`,
        },
    });

    if (!response.ok) {
        throw new Error(`API responded with status: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();

    if (data.Error) {
        throw new Error(`API Error: ${data.Msg}`);
    }

    return data.PunchData || [];
}

/**
 * Process raw punch data into attendance records
 */
export function processPunchData(punchData: PunchData[]): AttendanceEntry[] {
    // Group punches by Employee and Date
    const groupedPunches: Record<string, PunchData[]> = {};

    for (const punch of punchData) {
        // PunchDate format is "dd/MM/yyyy HH:mm:ss"
        // We need to extract the date part "dd/MM/yyyy" to group by day
        const [datePart] = punch.PunchDate.split(' ');
        const key = `${punch.Empcode}|${datePart}|${punch.Name}`;

        if (!groupedPunches[key]) {
            groupedPunches[key] = [];
        }
        groupedPunches[key].push(punch);
    }

    const entries: AttendanceEntry[] = [];

    for (const [key, punches] of Object.entries(groupedPunches)) {
        const [empCode, dateStr, empName] = key.split('|');

        // Parse dateStr "dd/MM/yyyy" to Date object
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        // Sort punches by time
        punches.sort((a, b) => {
            // Parse "dd/MM/yyyy HH:mm:ss" manually to ensure correct sorting
            const parseDate = (d: string) => {
                const [dPart, tPart] = d.split(' ');
                const [dd, mm, yy] = dPart.split('/').map(Number);
                const [hh, min, ss] = tPart.split(':').map(Number);
                return new Date(yy, mm - 1, dd, hh, min, ss).getTime();
            };
            return parseDate(a.PunchDate) - parseDate(b.PunchDate);
        });

        const inOutPeriods: { in: string; out: string }[] = [];

        // Logic to pair IN (mcid: 1) and OUT (mcid: 2)
        // Assumption: Sorted chronologically. 
        // We look for sequences of 1 -> 2.
        // If we have 1 -> 1, the first 1 is ignored (or maybe we take the first 1? Let's stick to simple pairing first)
        // Actually, usually 1 is entrance. If multiple 1s appear without a 2, maybe the last 1 is the valid one before the 2? 
        // Or maybe the first 1 is the valid one? 
        // Let's assume strict pairing: 1 opens a session, 2 closes it.

        let currentIn: string | null = null;

        for (const punch of punches) {
            const timePart = punch.PunchDate.split(' ')[1].substring(0, 5); // HH:mm

            if (punch.mcid === '1') {
                if (!currentIn) {
                    currentIn = timePart;
                } else {
                    // We already have an IN.
                    // Scenario: IN(10:00), IN(10:05) -> OUT(12:00)
                    // Which IN is correct? Usually the first one. 
                    // Let's keep the first IN.
                }
            } else if (punch.mcid === '2') {
                if (currentIn) {
                    inOutPeriods.push({ in: currentIn, out: timePart });
                    currentIn = null;
                } else {
                    // OUT without IN. Ignore or mark?
                    // For now, ignore orphan OUTs as we can't calculate duration.
                }
            }
        }

        // If there is a dangling IN at the end (User forgot to punch out)
        // We cannot form a period. It will be ignored for duration calculation but indicates presence.

        const firstIn = inOutPeriods.length > 0 ? inOutPeriods[0].in : (currentIn || null);
        const lastOut = inOutPeriods.length > 0 ? inOutPeriods[inOutPeriods.length - 1].out : null;

        // Calculate total duration
        let totalMinutes = 0;
        for (const period of inOutPeriods) {
            const [inH, inM] = period.in.split(':').map(Number);
            const [outH, outM] = period.out.split(':').map(Number);

            const start = inH * 60 + inM;
            const end = outH * 60 + outM;

            totalMinutes += (end - start);
        }

        const totalHours = totalMinutes / 60;

        let status: 'PRESENT' | 'ABSENT' | 'PARTIAL' = 'ABSENT';
        if (inOutPeriods.length > 0) {
            // If total duration is very low (e.g. < 4 hours), maybe PARTIAL?
            // Matching current logic: if present > 0 it is roughly PRESENT or PARTIAL.
            // Let's use simple logic: > 0 hours = PRESENT (or PARTIAL if very low).
            // For now, just mark PRESENT if any valid period, otherwise PARTIAL if punches exist but no valid period?
            status = 'PRESENT';
        } else if (punches.length > 0) {
            // Has punches but no complete intervals
            status = 'PARTIAL';
        }

        entries.push({
            employeeName: empName,
            employeeCode: empCode,
            date: date,
            inOutPeriods,
            firstIn,
            lastOut,
            totalHours,
            status,
            shift: null,
            workPlusOT: null
        });
    }

    return entries;
}

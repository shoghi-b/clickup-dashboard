
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
    unpairedIns: string[]; // IN entries without matching OUT
    unpairedOuts: string[]; // OUT entries without matching IN
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
 * Process raw punch data into attendance records with improved MCID pairing logic
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

        // Helper function to parse punch time
        const parseDateTime = (punchDate: string): Date => {
            const [dPart, tPart] = punchDate.split(' ');
            const [dd, mm, yy] = dPart.split('/').map(Number);
            const [hh, min, ss] = tPart.split(':').map(Number);
            return new Date(yy, mm - 1, dd, hh, min, ss);
        };

        // Helper function to extract time part as HH:mm
        const extractTime = (punchDate: string): string => {
            return punchDate.split(' ')[1].substring(0, 5); // HH:mm
        };

        // Sort all punches chronologically
        punches.sort((a, b) => parseDateTime(a.PunchDate).getTime() - parseDateTime(b.PunchDate).getTime());

        // Separate INs and OUTs
        interface TimedEntry {
            time: string;
            timestamp: number;
            original: PunchData;
        }

        const inEntries: TimedEntry[] = [];
        const outEntries: TimedEntry[] = [];

        for (const punch of punches) {
            const timeStr = extractTime(punch.PunchDate);
            const timestamp = parseDateTime(punch.PunchDate).getTime();
            const entry: TimedEntry = { time: timeStr, timestamp, original: punch };

            if (punch.mcid === '1') {
                inEntries.push(entry);
            } else if (punch.mcid === '2') {
                outEntries.push(entry);
            }
        }

        // Build IN-OUT pairs using improved algorithm
        // Strategy: For each IN, find the next chronological OUT
        // If multiple INs before an OUT, use the earliest IN
        // If multiple OUTs after an IN, use the latest OUT before the next IN

        const inOutPeriods: { in: string; out: string }[] = [];
        let usedInIndices = new Set<number>();
        let usedOutIndices = new Set<number>();

        for (let i = 0; i < inEntries.length; i++) {
            if (usedInIndices.has(i)) continue;

            const currentIn = inEntries[i];

            // Find all OUTs after this IN
            const subsequentOuts = outEntries.filter((out, idx) =>
                !usedOutIndices.has(idx) && out.timestamp > currentIn.timestamp
            );

            if (subsequentOuts.length === 0) {
                // No OUT found for this IN - will show as PARTIAL
                continue;
            }

            // Check if there's another IN before the first OUT
            const firstOutAfterIn = subsequentOuts[0];
            const duplicateIns = inEntries.filter((entry, idx) =>
                idx > i &&
                !usedInIndices.has(idx) &&
                entry.timestamp > currentIn.timestamp &&
                entry.timestamp < firstOutAfterIn.timestamp
            );

            if (duplicateIns.length > 0) {
                // Log duplicate IN entries being skipped
                console.log(`[Attendance Pairing] Duplicate IN entries found for ${empName} on ${dateStr}:`, {
                    kept: currentIn.time,
                    discarded: duplicateIns.map(d => d.time)
                });
                // Mark duplicate INs as used
                duplicateIns.forEach(dup => {
                    const dupIdx = inEntries.findIndex(e => e.timestamp === dup.timestamp);
                    if (dupIdx !== -1) usedInIndices.add(dupIdx);
                });
            }

            // Find the appropriate OUT for this IN
            // If there's another IN after this one, use the last OUT before that next IN
            // Otherwise, use the last OUT available
            const nextInAfterCurrent = inEntries.find((entry, idx) =>
                idx > i &&
                !usedInIndices.has(idx) &&
                entry.timestamp > currentIn.timestamp
            );

            let matchingOut: TimedEntry;
            if (nextInAfterCurrent) {
                // Find all OUTs between current IN and next IN
                const outsBeforeNextIn = subsequentOuts.filter(out =>
                    out.timestamp < nextInAfterCurrent.timestamp
                );

                if (outsBeforeNextIn.length > 0) {
                    // Use the latest OUT before next IN
                    matchingOut = outsBeforeNextIn[outsBeforeNextIn.length - 1];

                    if (outsBeforeNextIn.length > 1) {
                        console.log(`[Attendance Pairing] Multiple OUT entries found for ${empName} on ${dateStr}:`, {
                            used: matchingOut.time,
                            discarded: outsBeforeNextIn.slice(0, -1).map(o => o.time)
                        });
                    }
                } else {
                    // No OUT before next IN, skip this IN
                    continue;
                }
            } else {
                // This is the last IN, use the latest OUT available
                matchingOut = subsequentOuts[subsequentOuts.length - 1];

                if (subsequentOuts.length > 1) {
                    console.log(`[Attendance Pairing] Multiple OUT entries found for ${empName} on ${dateStr}:`, {
                        used: matchingOut.time,
                        discarded: subsequentOuts.slice(0, -1).map(o => o.time)
                    });
                }
            }

            // Create the pair
            inOutPeriods.push({
                in: currentIn.time,
                out: matchingOut.time
            });

            // Mark as used
            usedInIndices.add(i);
            const outIdx = outEntries.findIndex(e => e.timestamp === matchingOut.timestamp);
            if (outIdx !== -1) usedOutIndices.add(outIdx);
        }

        // Calculate first IN and last OUT from ALL entries (not just paired ones)
        const firstIn = inEntries.length > 0 ? inEntries[0].time : null;
        const lastOut = outEntries.length > 0 ? outEntries[outEntries.length - 1].time : null;

        // Collect unpaired INs and OUTs
        const unpairedIns: string[] = [];
        const unpairedOuts: string[] = [];

        for (let i = 0; i < inEntries.length; i++) {
            if (!usedInIndices.has(i)) {
                unpairedIns.push(inEntries[i].time);
            }
        }

        for (let i = 0; i < outEntries.length; i++) {
            if (!usedOutIndices.has(i)) {
                unpairedOuts.push(outEntries[i].time);
            }
        }

        // Calculate total duration from pairs
        let totalMinutes = 0;
        for (const period of inOutPeriods) {
            const [inH, inM] = period.in.split(':').map(Number);
            const [outH, outM] = period.out.split(':').map(Number);

            const start = inH * 60 + inM;
            const end = outH * 60 + outM;

            const duration = end - start;

            // Handle edge case where OUT is before IN (data error)
            if (duration < 0) {
                console.warn(`[Attendance Pairing] Invalid pair for ${empName} on ${dateStr}: OUT (${period.out}) before IN (${period.in})`);
                continue;
            }

            totalMinutes += duration;
        }

        const totalHours = totalMinutes / 60;

        // Determine status
        let status: 'PRESENT' | 'ABSENT' | 'PARTIAL' = 'ABSENT';
        if (inOutPeriods.length > 0) {
            status = 'PRESENT';
        } else if (punches.length > 0) {
            // Has punches but no complete IN-OUT pairs
            status = 'PARTIAL';
            console.log(`[Attendance Pairing] PARTIAL status for ${empName} on ${dateStr}: ${inEntries.length} INs, ${outEntries.length} OUTs, but no valid pairs`);
        }

        entries.push({
            employeeName: empName,
            employeeCode: empCode,
            date: date,
            inOutPeriods,
            unpairedIns,
            unpairedOuts,
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

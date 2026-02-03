import 'dotenv/config';
import { prisma } from '@/lib/prisma';

async function main() {
    const today = new Date('2026-02-03');
    const records = await prisma.attendanceRecord.findMany({
        where: {
            date: today
        }
    });

    console.log(`Found ${records.length} records for ${today.toISOString().split('T')[0]}`);

    for (const r of records) {
        console.log(`\nName: ${r.employeeName}`);
        console.log(`Status: ${r.status}`);
        console.log(`Total Hours: ${r.totalHours}`);
        console.log(`In/Out Periods: ${r.inOutPeriods}`);
        console.log(`Unpaired Ins: ${r.unpairedIns}`);
        console.log(`Unpaired Outs: ${r.unpairedOuts}`);
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });

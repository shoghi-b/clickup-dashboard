import 'dotenv/config';
import { prisma } from '@/lib/prisma';

async function main() {
    console.log('Checking Attendance Records...');
    const count = await prisma.attendanceRecord.count();
    console.log(`Total Attendance Records: ${count}`);

    const recent = await prisma.attendanceRecord.findMany({
        orderBy: { date: 'desc' },
        take: 5
    });

    console.log('Recent 5 Records:');
    console.log(JSON.stringify(recent, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

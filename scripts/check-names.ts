import 'dotenv/config';
import { prisma } from '@/lib/prisma';

async function main() {
    console.log('Checking Team Members...');
    const members = await prisma.teamMember.findMany({ select: { username: true, clickupId: true } });
    console.log('Team Members:', members.map(m => m.username));

    const attendance = await prisma.attendanceRecord.findMany({
        distinct: ['employeeName'],
        select: { employeeName: true }
    });
    console.log('Attendance Employee Names:', attendance.map(a => a.employeeName));
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });

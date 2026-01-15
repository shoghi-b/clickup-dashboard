import { prisma } from '../lib/prisma';

async function checkData() {
  try {
    const count = await prisma.attendanceRecord.count();
    console.log('Total attendance records:', count);
    
    if (count > 0) {
      const sample = await prisma.attendanceRecord.findMany({
        take: 5,
        orderBy: { date: 'desc' }
      });
      console.log('\nSample records:');
      sample.forEach(r => {
        console.log(`- ${r.employeeName} on ${r.date.toISOString().split('T')[0]}: ${r.totalHours}h (${r.status})`);
      });
      
      const uniqueNames = await prisma.attendanceRecord.findMany({
        distinct: ['employeeName'],
        select: { employeeName: true }
      });
      console.log('\nUnique employee names in attendance:');
      uniqueNames.forEach(n => console.log(`- ${n.employeeName}`));
      
      // Check team members
      const teamMembers = await prisma.teamMember.findMany({
        select: { username: true }
      });
      console.log('\nTeam member usernames:');
      teamMembers.forEach(m => console.log(`- ${m.username}`));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();


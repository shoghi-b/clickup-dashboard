// Test name matching logic

const attendanceNames = [
  'Jatin',
  'Rakesh',
  'Aayushi',
  'Varun',
  'Vaibhavi',
  'Rishabh',
  'Bijen Sheth',
  'Atharva',
  'Shreyasi',
  'Shoghi',
  'Akshay',
  'Mayur',
  'Rushali',
  'Mihir'
];

const teamMemberNames = [
  'Parag Soni',
  'Apurv Kiri',
  'Ashok Mistry',
  'Mihir Ladani',
  'Akshay Shera',
  'Shreyasi Guha Thakurta',
  'Atharva Gantellu',
  'Rishabh',
  'Vaibhavi Patankar',
  'Aayushi',
  'Rushali Bhatt',
  'Varun',
  'Shoghi Bagul',
  'Jatin Leuva'
];

console.log('Testing name matching logic:\n');

attendanceNames.forEach(attendanceName => {
  const matches = teamMemberNames.filter(memberName => {
    const attName = attendanceName.toLowerCase().trim();
    const memName = memberName.toLowerCase().trim();
    return memName.includes(attName) || attName.includes(memName);
  });
  
  if (matches.length > 0) {
    console.log(`✓ "${attendanceName}" matches: ${matches.join(', ')}`);
  } else {
    console.log(`✗ "${attendanceName}" - NO MATCH`);
  }
});

console.log('\n\nReverse check - Team members without attendance match:\n');

teamMemberNames.forEach(memberName => {
  const matches = attendanceNames.filter(attendanceName => {
    const attName = attendanceName.toLowerCase().trim();
    const memName = memberName.toLowerCase().trim();
    return memName.includes(attName) || attName.includes(memName);
  });
  
  if (matches.length === 0) {
    console.log(`✗ "${memberName}" - NO ATTENDANCE DATA`);
  }
});


// Test file for attendance pairing logic
// This demonstrates the expected behavior with various edge cases

import { processPunchData } from '../attendance-api';

interface PunchData {
    Name: string;
    Empcode: string;
    PunchDate: string;
    M_Flag: null | string;
    mcid: string;
}

function createPunch(name: string, code: string, date: string, time: string, mcid: '1' | '2'): PunchData {
    return {
        Name: name,
        Empcode: code,
        PunchDate: `${date} ${time}:00`,
        M_Flag: null,
        mcid: mcid
    };
}

console.log('=== Testing Attendance Pairing Logic ===\n');

// Test 1: Normal pairing (IN-OUT-IN-OUT)
console.log('Test 1: Normal pairing');
const test1Data: PunchData[] = [
    createPunch('John Doe', 'E001', '01/01/2026', '09:00', '1'),
    createPunch('John Doe', 'E001', '01/01/2026', '12:00', '2'),
    createPunch('John Doe', 'E001', '01/01/2026', '13:00', '1'),
    createPunch('John Doe', 'E001', '01/01/2026', '18:00', '2'),
];
const result1 = processPunchData(test1Data);
console.log('Result:', JSON.stringify(result1[0], null, 2));
console.log('Expected: 2 pairs, 9h total, PRESENT\n');

// Test 2: Duplicate IN (IN-IN-OUT)
console.log('Test 2: Duplicate IN entries');
const test2Data: PunchData[] = [
    createPunch('Jane Smith', 'E002', '01/01/2026', '09:00', '1'),
    createPunch('Jane Smith', 'E002', '01/01/2026', '09:05', '1'), // Duplicate
    createPunch('Jane Smith', 'E002', '01/01/2026', '12:00', '2'),
];
const result2 = processPunchData(test2Data);
console.log('Result:', JSON.stringify(result2[0], null, 2));
console.log('Expected: 1 pair using 09:00 (earliest IN), 3h total, PRESENT\n');

// Test 3: Duplicate OUT (IN-OUT-OUT)
console.log('Test 3: Duplicate OUT entries');
const test3Data: PunchData[] = [
    createPunch('Bob Jones', 'E003', '01/01/2026', '09:00', '1'),
    createPunch('Bob Jones', 'E003', '01/01/2026', '17:00', '2'),
    createPunch('Bob Jones', 'E003', '01/01/2026', '17:30', '2'), // Duplicate
];
const result3 = processPunchData(test3Data);
console.log('Result:', JSON.stringify(result3[0], null, 2));
console.log('Expected: 1 pair using 17:30 (latest OUT), 8.5h total, PRESENT\n');

// Test 4: Missing OUT (IN-IN)
console.log('Test 4: Missing OUT');
const test4Data: PunchData[] = [
    createPunch('Alice Brown', 'E004', '01/01/2026', '09:00', '1'),
    createPunch('Alice Brown', 'E004', '01/01/2026', '10:00', '1'),
];
const result4 = processPunchData(test4Data);
console.log('Result:', JSON.stringify(result4[0], null, 2));
console.log('Expected: 0 pairs, 0h total, PARTIAL status, firstIn=09:00\n');

// Test 5: Missing IN (OUT-OUT) - orphan OUTs
console.log('Test 5: Missing IN (orphan OUTs)');
const test5Data: PunchData[] = [
    createPunch('Charlie Davis', 'E005', '01/01/2026', '17:00', '2'),
    createPunch('Charlie Davis', 'E005', '01/01/2026', '18:00', '2'),
];
const result5 = processPunchData(test5Data);
console.log('Result:', JSON.stringify(result5[0], null, 2));
console.log('Expected: 0 pairs, 0h total, PARTIAL status, lastOut=18:00\n');

// Test 6: Complex scenario (IN-IN-OUT-IN-OUT-OUT)
console.log('Test 6: Complex mixed duplicates');
const test6Data: PunchData[] = [
    createPunch('Eve Wilson', 'E006', '01/01/2026', '09:00', '1'),
    createPunch('Eve Wilson', 'E006', '01/01/2026', '09:10', '1'), // Duplicate
    createPunch('Eve Wilson', 'E006', '01/01/2026', '12:00', '2'),
    createPunch('Eve Wilson', 'E006', '01/01/2026', '13:00', '1'),
    createPunch('Eve Wilson', 'E006', '01/01/2026', '17:30', '2'),
    createPunch('Eve Wilson', 'E006', '01/01/2026', '18:00', '2'), // Duplicate
];
const result6 = processPunchData(test6Data);
console.log('Result:', JSON.stringify(result6[0], null, 2));
console.log('Expected: 2 pairs - (09:00-12:00, 13:00-18:00), 7.5h total, PRESENT\n');

// Test 7: Single IN only
console.log('Test 7: Single IN only');
const test7Data: PunchData[] = [
    createPunch('Frank Miller', 'E007', '01/01/2026', '09:00', '1'),
];
const result7 = processPunchData(test7Data);
console.log('Result:', JSON.stringify(result7[0], null, 2));
console.log('Expected: 0 pairs, 0h total, PARTIAL status\n');

// Test 8: Multiple sessions (IN-OUT-IN-OUT-IN-OUT)
console.log('Test 8: Multiple valid sessions');
const test8Data: PunchData[] = [
    createPunch('Grace Lee', 'E008', '01/01/2026', '08:00', '1'),
    createPunch('Grace Lee', 'E008', '01/01/2026', '10:00', '2'),
    createPunch('Grace Lee', 'E008', '01/01/2026', '10:15', '1'),
    createPunch('Grace Lee', 'E008', '01/01/2026', '12:00', '2'),
    createPunch('Grace Lee', 'E008', '01/01/2026', '13:00', '1'),
    createPunch('Grace Lee', 'E008', '01/01/2026', '19:00', '2'),
];
const result8 = processPunchData(test8Data);
console.log('Result:', JSON.stringify(result8[0], null, 2));
console.log('Expected: 3 pairs, 9.75h total (2h + 1.75h + 6h), PRESENT\n');

console.log('=== All Tests Complete ===');

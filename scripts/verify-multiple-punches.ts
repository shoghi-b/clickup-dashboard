
import { processPunchData } from '../lib/services/attendance-api';

// Mock data: One employee, one day, two sessions (IN -> OUT, IN -> OUT)
const mockPunches = [
    {
        Name: 'Test Employee',
        Empcode: '001',
        PunchDate: '29/01/2026 09:00:00', // First IN
        M_Flag: null,
        mcid: '1'
    },
    {
        Name: 'Test Employee',
        Empcode: '001',
        PunchDate: '29/01/2026 12:00:00', // First OUT
        M_Flag: null,
        mcid: '2'
    },
    {
        Name: 'Test Employee',
        Empcode: '001',
        PunchDate: '29/01/2026 13:00:00', // Second IN
        M_Flag: null,
        mcid: '1'
    },
    {
        Name: 'Test Employee',
        Empcode: '001',
        PunchDate: '29/01/2026 18:00:00', // Second OUT
        M_Flag: null,
        mcid: '2'
    }
];

console.log('--- Processing Mock Data with Multiple Sessions ---');
const results = processPunchData(mockPunches);

console.log(JSON.stringify(results, null, 2));

// Check if we have 2 periods
if (results[0].inOutPeriods.length === 2) {
    console.log('SUCCESS: All IN/OUT entries captured.');
} else {
    console.error('FAILURE: Missing IN/OUT entries.');
}

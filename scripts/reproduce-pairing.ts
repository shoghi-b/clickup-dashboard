
import { processPunchData } from '@/lib/services/attendance-api';

// Mock the raw data provided by user
const rawData: any[] = [
    {
        "Name": "Shoghi Bagul",
        "Empcode": "8",
        "PunchDate": "02/02/2026 19:59:00",
        "M_Flag": null,
        "mcid": "2"
    },
    {
        "Name": "Shoghi Bagul",
        "Empcode": "8",
        "PunchDate": "02/02/2026 19:41:00",
        "M_Flag": null,
        "mcid": "1"
    },
    {
        "Name": "Shoghi Bagul",
        "Empcode": "8",
        "PunchDate": "02/02/2026 19:25:00",
        "M_Flag": null,
        "mcid": "2"
    },
    {
        "Name": "Shoghi Bagul",
        "Empcode": "8",
        "PunchDate": "02/02/2026 17:52:00",
        "M_Flag": null,
        "mcid": "1"
    },
    {
        "Name": "Shoghi Bagul",
        "Empcode": "8",
        "PunchDate": "02/02/2026 17:41:00",
        "M_Flag": null,
        "mcid": "2"
    },
    {
        "Name": "Shoghi Bagul",
        "Empcode": "8",
        "PunchDate": "02/02/2026 14:25:00",
        "M_Flag": null,
        "mcid": "1"
    },
    {
        "Name": "Shoghi Bagul",
        "Empcode": "8",
        "PunchDate": "02/02/2026 14:12:00",
        "M_Flag": null,
        "mcid": "2"
    },
    {
        "Name": "Shoghi Bagul",
        "Empcode": "8",
        "PunchDate": "02/02/2026 11:55:00",
        "M_Flag": null,
        "mcid": "1"
    },
    {
        "Name": "Shoghi Bagul",
        "Empcode": "8",
        "PunchDate": "02/02/2026 11:54:00",
        "M_Flag": null,
        "mcid": "2"
    },
    {
        "Name": "Shoghi Bagul",
        "Empcode": "8",
        "PunchDate": "02/02/2026 10:08:00",
        "M_Flag": null,
        "mcid": "1"
    }
];

// Run the processing logic
console.log('Processing raw punch data...');
const results = processPunchData(rawData);

console.log(JSON.stringify(results, null, 2));

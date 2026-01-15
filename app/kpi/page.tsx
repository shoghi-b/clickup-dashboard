'use client';

import { useState } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { KPIOverview } from '@/components/dashboard/kpi-overview';
import { InsightsPanel } from '@/components/dashboard/insights-panel';
import { MemberKPIList } from '@/components/dashboard/member-kpi-list';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function KPIDashboard() {
  const [dateRange, setDateRange] = useState({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">KPI Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Accountability, capacity, and risk insights for your team
            </p>
          </div>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      {/* Insights Panel - Top Priority */}
      <InsightsPanel dateRange={dateRange} />

      {/* Team KPI Overview */}
      <KPIOverview dateRange={dateRange} />

      {/* Member KPI List */}
      <MemberKPIList dateRange={dateRange} />

      {/* Documentation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">How to Use This Dashboard</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <p className="font-medium">1. Review Insights First</p>
            <p className="text-blue-700">Start with the insights panel - it highlights the most critical issues requiring immediate attention.</p>
          </div>
          <div>
            <p className="font-medium">2. Check Team KPIs</p>
            <p className="text-blue-700">Review accountability (attendance, timesheet compliance), capacity (utilization), and risk signals (late logging, weekend work).</p>
          </div>
          <div>
            <p className="font-medium">3. Drill into Member Details</p>
            <p className="text-blue-700">Identify specific team members who need follow-up based on their risk level and action items.</p>
          </div>
          <div>
            <p className="font-medium">4. Take Action</p>
            <p className="text-blue-700">Use the suggested actions in each insight to address issues systematically.</p>
          </div>
        </div>
      </div>

      {/* KPI Definitions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">KPI Definitions</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-900">Attendance Compliance</p>
            <p className="text-gray-600">% of expected workdays where members were marked present</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Timesheet Compliance</p>
            <p className="text-gray-600">% of expected workdays with minimum hours logged (4h+)</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Present, Not Logged</p>
            <p className="text-gray-600">Members marked present but didn't log any time - critical data integrity issue</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Utilization</p>
            <p className="text-gray-600">Logged hours / Expected hours. Target: 70-80% (allows for meetings, context switching)</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Late Logging</p>
            <p className="text-gray-600">Time logged 2+ days after the work date - indicates backfilling and unreliable data</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Weekend Logging</p>
            <p className="text-gray-600">Time logged on Saturdays/Sundays - potential burnout risk or time-padding</p>
          </div>
        </div>
      </div>
    </div>
  );
}


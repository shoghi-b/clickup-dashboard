'use client';

import { useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { WeeklyKPICards } from '@/components/dashboard/weekly-kpi-cards';
import { RiskSignalsCard } from '@/components/dashboard/risk-signals-card';
import { KPIDrillDownSheet } from '@/components/dashboard/kpi-drill-down-sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface WeeklyKPIData {
  period: {
    start: string;
    end: string;
  };
  kpi: {
    attendanceCompliance: number;
    timesheetCompliance: number;
    presentNotLogged: number;
    avgUtilization: number;
    overCapacity: number;
    underCapacity: number;
  };
  riskSignals: any[];
  insights: any;
  members: any[];
}

export default function WeeklyDashboard() {
  const [dateRange, setDateRange] = useState({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [data, setData] = useState<WeeklyKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownMetric, setDrillDownMetric] = useState<string>('');
  const [drillDownMembers, setDrillDownMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchWeeklyKPI();
  }, [dateRange]);

  const fetchWeeklyKPI = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: dateRange.from.toISOString(),
      });
      const response = await fetch(`/api/weekly-kpi?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch weekly KPI:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (metric: string) => {
    if (!data) return;

    let filteredMembers: any[] = [];
    let title = '';
    let description = '';

    switch (metric) {
      case 'attendanceCompliance':
        filteredMembers = data.members.filter((m) => !m.attendanceCompliance);
        title = 'Attendance Compliance Issues';
        description = 'Members with less than 4 days of attendance this week';
        break;
      case 'timesheetCompliance':
        filteredMembers = data.members.filter((m) => !m.timesheetCompliance);
        title = 'Timesheet Compliance Issues';
        description = 'Members with less than 4 days of proper logging this week';
        break;
      case 'presentNotLogged':
        filteredMembers = data.members.filter((m) =>
          m.days.some((d: any) => d.isPresent && d.clickup < 1)
        );
        title = 'Present But Not Logged';
        description = 'Members who were present but did not log time';
        break;
      case 'avgUtilization':
        filteredMembers = data.members;
        title = 'Team Utilization';
        description = 'All team members with their utilization rates';
        break;
      case 'overCapacity':
        filteredMembers = data.members.filter((m) => m.utilization > 85);
        title = 'Over Capacity Members';
        description = 'Members logging more than 85% utilization (burnout risk)';
        break;
      case 'underCapacity':
        filteredMembers = data.members.filter((m) => m.utilization < 60);
        title = 'Under Capacity Members';
        description = 'Members logging less than 60% utilization';
        break;
    }

    setDrillDownMetric(metric);
    setDrillDownMembers(
      filteredMembers.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        days: m.days,
        total: m.total,
        metric: m.utilization,
      }))
    );
    setDrillDownOpen(true);
  };

  const getDayStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'missing':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-gray-500">Loading weekly dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Timesheet & Attendance Analytics</h1>
            <p className="text-sm text-gray-600 mt-1">
              Weekly snapshot: {format(new Date(data.period.start), 'MMM dd')} -{' '}
              {format(new Date(data.period.end), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
        <Button onClick={fetchWeeklyKPI} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards and Risk Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WeeklyKPICards kpiData={data.kpi} onCardClick={handleCardClick} />
        </div>
        <div>
          <RiskSignalsCard signals={data.riskSignals} insights={data.insights} />
        </div>
      </div>

      {/* Weekly Data Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Weekly Summary</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
              <span>Present & Logged</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
              <span>Present Not Logged</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
              <span>Missing</span>
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="text-center">Status</TableHead>
                {data.members[0]?.days.map((day: any, idx: number) => (
                  <TableHead key={idx} className="text-center">
                    {format(new Date(day.date), 'EEE')}
                    <br />
                    <span className="text-xs text-gray-500">
                      {format(new Date(day.date), 'MM/dd')}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        member.status === 'Healthy'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {member.status}
                    </span>
                  </TableCell>
                  {member.days.map((day: any, idx: number) => (
                    <TableCell key={idx} className="text-center">
                      <div
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getDayStatusColor(
                          day.status
                        )}`}
                      >
                        {day.clickup > 0 ? `${day.clickup.toFixed(1)}h` : '-'}
                        {day.attendance > 0 && (
                          <div className="text-xs text-gray-500">
                            ({day.attendance.toFixed(1)}h)
                          </div>
                        )}
                      </div>
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-semibold">
                    {member.total.toFixed(1)}h
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Drill-down Sheet */}
      <KPIDrillDownSheet
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
        metric={drillDownMetric}
        title={
          drillDownMetric === 'attendanceCompliance'
            ? 'Attendance Compliance Issues'
            : drillDownMetric === 'timesheetCompliance'
            ? 'Timesheet Compliance Issues'
            : drillDownMetric === 'presentNotLogged'
            ? 'Present But Not Logged'
            : drillDownMetric === 'avgUtilization'
            ? 'Team Utilization'
            : drillDownMetric === 'overCapacity'
            ? 'Over Capacity Members'
            : 'Under Capacity Members'
        }
        description={
          drillDownMetric === 'attendanceCompliance'
            ? 'Members with less than 4 days of attendance this week'
            : drillDownMetric === 'timesheetCompliance'
            ? 'Members with less than 4 days of proper logging this week'
            : drillDownMetric === 'presentNotLogged'
            ? 'Members who were present but did not log time'
            : drillDownMetric === 'avgUtilization'
            ? 'All team members with their utilization rates'
            : drillDownMetric === 'overCapacity'
            ? 'Members logging more than 85% utilization (burnout risk)'
            : 'Members logging less than 60% utilization'
        }
        members={drillDownMembers}
      />
    </div>
  );
}


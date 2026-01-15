'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

interface TeamKPI {
  id: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  attendanceComplianceRate: number;
  timesheetComplianceRate: number;
  presentNotLoggedCount: number;
  avgUtilization: number;
  overCapacityCount: number;
  underCapacityCount: number;
  lateLoggingCount: number;
  zeroHourDaysCount: number;
  weekendLoggingCount: number;
  totalMembers: number;
  activeMembersCount: number;
}

interface KPIOverviewProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function KPIOverview({ dateRange }: KPIOverviewProps) {
  const [teamKPI, setTeamKPI] = useState<TeamKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchTeamKPI();
  }, [dateRange]);

  const fetchTeamKPI = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periodType: 'WEEKLY',
        date: dateRange.from.toISOString(),
      });
      const response = await fetch(`/api/kpi/team?${params}`);
      const result = await response.json();

      if (result.success) {
        setTeamKPI(result.data);
      } else {
        setTeamKPI(null);
      }
    } catch (error) {
      console.error('Failed to fetch team KPI:', error);
      setTeamKPI(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = async () => {
    setCalculating(true);
    try {
      const response = await fetch('/api/kpi/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodType: 'WEEKLY',
          date: dateRange.from.toISOString(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchTeamKPI();
      }
    } catch (error) {
      console.error('Failed to calculate KPIs:', error);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Loading KPIs...</p>
        </CardContent>
      </Card>
    );
  }

  if (!teamKPI) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team KPIs</CardTitle>
          <CardDescription>No KPI data available for this period</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={calculateKPIs} disabled={calculating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'Calculating...' : 'Calculate KPIs'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getComplianceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationColor = (util: number) => {
    if (util >= 70 && util <= 85) return 'text-green-600';
    if (util >= 60 && util < 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team KPIs</h2>
          <p className="text-sm text-gray-500">
            {format(new Date(teamKPI.periodStart), 'MMM dd')} - {format(new Date(teamKPI.periodEnd), 'MMM dd, yyyy')}
          </p>
        </div>
        <Button onClick={calculateKPIs} disabled={calculating} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="accountability" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accountability">Accountability</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="risk">Risk Signals</TabsTrigger>
        </TabsList>

        {/* Accountability KPIs */}
        <TabsContent value="accountability" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Attendance Compliance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Attendance Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getComplianceColor(teamKPI.attendanceComplianceRate)}`}>
                  {teamKPI.attendanceComplianceRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {teamKPI.attendanceComplianceRate >= 80
                    ? '✓ Team is showing up as expected'
                    : '⚠ Attendance problem detected'}
                </p>
                <div className="mt-3 text-xs">
                  <p className="font-medium">What this means:</p>
                  <p className="text-gray-600">% of expected workdays where members were present</p>
                </div>
              </CardContent>
            </Card>

            {/* Timesheet Compliance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Timesheet Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getComplianceColor(teamKPI.timesheetComplianceRate)}`}>
                  {teamKPI.timesheetComplianceRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {teamKPI.timesheetComplianceRate >= 80
                    ? '✓ Good logging discipline'
                    : '⚠ Data cannot be trusted'}
                </p>
                <div className="mt-3 text-xs">
                  <p className="font-medium">What this means:</p>
                  <p className="text-gray-600">% of expected workdays with minimum hours logged</p>
                </div>
              </CardContent>
            </Card>

            {/* Present, Not Logged */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Present, Not Logged
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${teamKPI.presentNotLoggedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {teamKPI.presentNotLoggedCount}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {teamKPI.presentNotLoggedCount === 0
                    ? '✓ All present members logging time'
                    : '🚨 Critical reconciliation issue'}
                </p>
                <div className="mt-3 text-xs">
                  <p className="font-medium">What this means:</p>
                  <p className="text-gray-600">Members present but didn't log time</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Accountability Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamKPI.attendanceComplianceRate < 80 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Investigate attendance issues</p>
                    <p className="text-xs text-gray-600">Validate attendance source, check for gaps</p>
                  </div>
                </div>
              )}
              {teamKPI.timesheetComplianceRate < 80 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Enforce logging discipline</p>
                    <p className="text-xs text-gray-600">Send reminders, block incentives if needed</p>
                  </div>
                </div>
              )}
              {teamKPI.presentNotLoggedCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Immediate follow-up required</p>
                    <p className="text-xs text-gray-600">{teamKPI.presentNotLoggedCount} member(s) present but not logging</p>
                  </div>
                </div>
              )}
              {teamKPI.attendanceComplianceRate >= 80 && teamKPI.timesheetComplianceRate >= 80 && teamKPI.presentNotLoggedCount === 0 && (
                <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Accountability is strong</p>
                    <p className="text-xs text-gray-600">Continue monitoring and maintain current practices</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capacity KPIs */}
        <TabsContent value="capacity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Average Utilization */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Avg Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getUtilizationColor(teamKPI.avgUtilization)}`}>
                  {teamKPI.avgUtilization.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {teamKPI.avgUtilization >= 70 && teamKPI.avgUtilization <= 85
                    ? '✓ Healthy utilization'
                    : teamKPI.avgUtilization < 60
                    ? '⚠ Underutilized'
                    : '⚠ Risk of burnout'}
                </p>
                <div className="mt-3 text-xs">
                  <p className="font-medium">What this means:</p>
                  <p className="text-gray-600">Average (Logged / Expected) across team</p>
                  <p className="text-gray-500 mt-1">Target: 70-80%</p>
                </div>
              </CardContent>
            </Card>

            {/* Over Capacity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Over Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${teamKPI.overCapacityCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {teamKPI.overCapacityCount}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {teamKPI.overCapacityCount === 0
                    ? '✓ No burnout risk'
                    : '⚠ Hidden burnout risk'}
                </p>
                <div className="mt-3 text-xs">
                  <p className="font-medium">What this means:</p>
                  <p className="text-gray-600">Members logging above expected hours</p>
                </div>
              </CardContent>
            </Card>

            {/* Under Capacity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Under Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${teamKPI.underCapacityCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {teamKPI.underCapacityCount}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {teamKPI.underCapacityCount === 0
                    ? '✓ Good capacity balance'
                    : '⚠ Review allocation'}
                </p>
                <div className="mt-3 text-xs">
                  <p className="font-medium">What this means:</p>
                  <p className="text-gray-600">Members logging below expected hours</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Capacity Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamKPI.avgUtilization < 60 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Team underutilized</p>
                    <p className="text-xs text-gray-600">Adjust staffing, rebalance work, or verify logging</p>
                  </div>
                </div>
              )}
              {teamKPI.avgUtilization > 85 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Team over-capacity</p>
                    <p className="text-xs text-gray-600">Add support, reallocate work, or adjust timelines</p>
                  </div>
                </div>
              )}
              {teamKPI.overCapacityCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Burnout risk detected</p>
                    <p className="text-xs text-gray-600">{teamKPI.overCapacityCount} member(s) consistently over capacity</p>
                  </div>
                </div>
              )}
              {teamKPI.underCapacityCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                  <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Review capacity planning</p>
                    <p className="text-xs text-gray-600">{teamKPI.underCapacityCount} member(s) under capacity - planning or discipline issue?</p>
                  </div>
                </div>
              )}
              {teamKPI.avgUtilization >= 70 && teamKPI.avgUtilization <= 85 && teamKPI.overCapacityCount === 0 && teamKPI.underCapacityCount === 0 && (
                <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Capacity is healthy</p>
                    <p className="text-xs text-gray-600">Team is well-balanced with good buffer for meetings and context switching</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Signals */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Late Logging */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Logging After 2+ Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${teamKPI.lateLoggingCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {teamKPI.lateLoggingCount}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {teamKPI.lateLoggingCount === 0
                    ? '✓ Good same-day logging'
                    : '⚠ Backfilling detected'}
                </p>
                <div className="mt-3 text-xs">
                  <p className="font-medium">What this means:</p>
                  <p className="text-gray-600">Members logging time 2+ days late → unreliable data</p>
                </div>
              </CardContent>
            </Card>

            {/* Zero Hour Days */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Repeated 0h Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${teamKPI.zeroHourDaysCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {teamKPI.zeroHourDaysCount}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {teamKPI.zeroHourDaysCount === 0
                    ? '✓ Consistent logging'
                    : '⚠ Silent non-compliance'}
                </p>
                <div className="mt-3 text-xs">
                  <p className="font-medium">What this means:</p>
                  <p className="text-gray-600">Either absenteeism or silent non-compliance</p>
                </div>
              </CardContent>
            </Card>

            {/* Weekend Logging */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Weekend Logging
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${teamKPI.weekendLoggingCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {teamKPI.weekendLoggingCount}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {teamKPI.weekendLoggingCount === 0
                    ? '✓ Good work-life balance'
                    : '⚠ Potential burnout or padding'}
                </p>
                <div className="mt-3 text-xs">
                  <p className="font-medium">What this means:</p>
                  <p className="text-gray-600">Potential burnout risk or time-padding</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamKPI.lateLoggingCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Investigate late logging patterns</p>
                    <p className="text-xs text-gray-600">Look for patterns, not one-offs. Enforce same-day logging</p>
                  </div>
                </div>
              )}
              {teamKPI.zeroHourDaysCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Verify work status on 0h days</p>
                    <p className="text-xs text-gray-600">Cross-check with attendance data</p>
                  </div>
                </div>
              )}
              {teamKPI.weekendLoggingCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Review weekend work patterns</p>
                    <p className="text-xs text-gray-600">Investigate context - legitimate work vs time-padding</p>
                  </div>
                </div>
              )}
              {teamKPI.lateLoggingCount === 0 && teamKPI.zeroHourDaysCount === 0 && teamKPI.weekendLoggingCount === 0 && (
                <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">No risk signals detected</p>
                    <p className="text-xs text-gray-600">Team is logging consistently with good discipline</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Members</p>
                  <p className="text-2xl font-bold">{teamKPI.totalMembers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Members</p>
                  <p className="text-2xl font-bold">{teamKPI.activeMembersCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import { RefreshCw, Users, Calendar, TrendingUp } from 'lucide-react';
import { TeamOverview } from '@/components/dashboard/team-overview';
import { TimesheetGridView } from '@/components/dashboard/timesheet-grid-view';
import { MonthGridView } from '@/components/dashboard/month-grid-view';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface DashboardStats {
  totalTeamMembers: number;
  complianceRate: number;
  avgUtilization: number;
  totalHours: number;
}

export default function DashboardPage() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [stats, setStats] = useState<DashboardStats>({
    totalTeamMembers: 0,
    complianceRate: 0,
    avgUtilization: 0,
    totalHours: 0,
  });

  // Update date range when view mode changes
  const handleViewModeChange = (mode: 'week' | 'month' | 'team') => {
    if (mode === 'team') return; // Don't change date range for team overview

    setViewMode(mode);
    if (mode === 'week') {
      setDateRange({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      });
    } else {
      setDateRange({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      });
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      const response = await fetch(`/api/analytics/stats?${params}`);
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Sync team members first
      const teamResponse = await fetch('/api/sync/team-members', {
        method: 'POST',
      });
      const teamResult = await teamResponse.json();

      if (!teamResult.success) {
        throw new Error(teamResult.error);
      }

      // Then sync time entries using the selected date range
      const timeResponse = await fetch('/api/sync/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }),
      });
      const timeResult = await timeResponse.json();

      if (!timeResult.success) {
        throw new Error(timeResult.error);
      }

      setLastSync(new Date());

      // Refresh stats after sync
      await fetchStats();

      alert(`Sync completed successfully! Synced ${timeResult.count} time entries.`);
    } catch (error) {
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ClickUp Timesheet Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Team-level dashboard for timesheet compliance and capacity utilization
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastSync && (
              <p className="text-sm text-gray-500">
                Last sync: {format(lastSync, 'MMM dd, yyyy HH:mm:ss')}
              </p>
            )}
            <Button onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Data'}
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <DateRangePicker value={dateRange} onChange={setDateRange} mode={viewMode} />
          </div>
          <p className="text-sm text-gray-500">
            {viewMode === 'week'
              ? `Week of ${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
              : format(dateRange.from, 'MMMM yyyy')
            }
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTeamMembers}</div>
              <p className="text-xs text-muted-foreground">Active team members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.complianceRate}%</div>
              <p className="text-xs text-muted-foreground">Selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgUtilization}%</div>
              <p className="text-xs text-muted-foreground">Team average</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs
          defaultValue="week"
          className="space-y-4"
          onValueChange={(value) => handleViewModeChange(value as 'week' | 'month' | 'team')}
        >
          <TabsList>
            <TabsTrigger value="week">Week View</TabsTrigger>
            <TabsTrigger value="month">Month View</TabsTrigger>
            <TabsTrigger value="team">Team Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="space-y-4">
            <TimesheetGridView dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="month" className="space-y-4">
            <MonthGridView dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <TeamOverview />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

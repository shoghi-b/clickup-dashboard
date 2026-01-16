'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import { CustomDateRangePicker } from '@/components/ui/custom-date-range-picker';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RefreshCw, Users, Calendar, TrendingUp, Filter, ChevronDown, Clock, BarChart3, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Activity } from 'lucide-react';
import { TeamOverview } from '@/components/dashboard/team-overview';
import { TimesheetGridView } from '@/components/dashboard/timesheet-grid-view';
import { MonthGridView } from '@/components/dashboard/month-grid-view';
import { ResetDataButton } from '@/components/dashboard/reset-data-button';
import { WeeklyKPICards } from '@/components/dashboard/weekly-kpi-cards';
import { RiskSignalsCard } from '@/components/dashboard/risk-signals-card';
import { KPIDrillDownSheet } from '@/components/dashboard/kpi-drill-down-sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subMonths, subQuarters, subYears } from 'date-fns';

interface DashboardStats {
  totalTeamMembers: number;
  complianceRate: number;
  avgUtilization: number;
  totalHours: number;
}

interface TeamMember {
  id: string;
  username: string;
  email: string | null;
  profilePicture: string | null;
}

export default function DashboardPage() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  // Initialize with null to prevent hydration mismatch, will be set in useEffect
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalTeamMembers: 0,
    complianceRate: 0,
    avgUtilization: 0,
    totalHours: 0,
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [syncSheetOpen, setSyncSheetOpen] = useState(false);
  const [showMemberFilter, setShowMemberFilter] = useState(false);

  // Attendance upload state
  const [attendanceSheetOpen, setAttendanceSheetOpen] = useState(false);
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  // Initialize with null to prevent hydration mismatch, will be set in useEffect
  const [attendanceDateRange, setAttendanceDateRange] = useState<DateRange | null>(null);
  const [uploadingAttendance, setUploadingAttendance] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    summary?: any;
  } | null>(null);

  // Weekly KPI state
  const [weeklyKPIData, setWeeklyKPIData] = useState<any>(null);
  const [loadingKPI, setLoadingKPI] = useState(false);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownMetric, setDrillDownMetric] = useState<string>('');
  const [drillDownMembers, setDrillDownMembers] = useState<any[]>([]);

  // Initialize date ranges after mount to prevent hydration mismatch
  useEffect(() => {
    if (dateRange === null) {
      setDateRange({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      });
    }
    if (attendanceDateRange === null) {
      setAttendanceDateRange({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      });
    }
  }, []);

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
    if (dateRange) {
      fetchStats();
      fetchTeamMembers();
    }
  }, [dateRange]);

  // Fetch KPI when date range or selected members change
  useEffect(() => {
    if (selectedMembers.length > 0 && dateRange) {
      fetchWeeklyKPI();
    }
  }, [dateRange, selectedMembers]);

  const fetchWeeklyKPI = async () => {
    if (!dateRange) return;
    setLoadingKPI(true);
    try {
      const params = new URLSearchParams({
        date: dateRange.from.toISOString(),
        memberIds: selectedMembers.join(','),
      });
      const response = await fetch(`/api/weekly-kpi?${params}`);
      const result = await response.json();

      if (result.success) {
        setWeeklyKPIData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch weekly KPI:', error);
    } finally {
      setLoadingKPI(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team-members');
      const result = await response.json();
      if (result.success) {
        setTeamMembers(result.data);
        // Initially select all members
        if (selectedMembers.length === 0) {
          setSelectedMembers(result.data.map((m: TeamMember) => m.id));
        }
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const handleQuickAction = (action: string) => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (action) {
      case 'thisWeek':
        from = startOfWeek(now, { weekStartsOn: 1 });
        to = endOfWeek(now, { weekStartsOn: 1 });
        setViewMode('week');
        break;
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1);
        from = startOfWeek(lastWeek, { weekStartsOn: 1 });
        to = endOfWeek(lastWeek, { weekStartsOn: 1 });
        setViewMode('week');
        break;
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        setViewMode('month');
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        setViewMode('month');
        break;
      case 'thisQuarter':
        from = startOfQuarter(now);
        to = endOfQuarter(now);
        setViewMode('month');
        break;
      case 'lastQuarter':
        const lastQuarter = subQuarters(now, 1);
        from = startOfQuarter(lastQuarter);
        to = endOfQuarter(lastQuarter);
        setViewMode('month');
        break;
      case 'thisYear':
        from = startOfYear(now);
        to = endOfYear(now);
        setViewMode('month');
        break;
      case 'lastYear':
        const lastYear = subYears(now, 1);
        from = startOfYear(lastYear);
        to = endOfYear(lastYear);
        setViewMode('month');
        break;
      default:
        return;
    }

    setDateRange({ from, to });
    // Sheet will auto-close when sync starts
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        // Don't allow deselecting if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const isMemberSelected = (memberId: string) => {
    return selectedMembers.includes(memberId);
  };

  const toggleAllMembers = () => {
    if (selectedMembers.length === teamMembers.length) {
      // Don't allow deselecting all
      return;
    } else {
      setSelectedMembers(teamMembers.map(m => m.id));
    }
  };

  const handleAttendanceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttendanceFile(file);
      setUploadResult(null);
    }
  };

  const handleAttendanceUpload = async () => {
    if (!attendanceFile) {
      setUploadResult({
        success: false,
        message: 'Please select a file to upload'
      });
      return;
    }

    if (!attendanceDateRange || !attendanceDateRange.from || !attendanceDateRange.to) {
      setUploadResult({
        success: false,
        message: 'Please select a date range'
      });
      return;
    }

    setUploadingAttendance(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', attendanceFile);
      formData.append('startDate', attendanceDateRange.from.toISOString());
      formData.append('endDate', attendanceDateRange.to.toISOString());

      const response = await fetch('/api/attendance/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUploadResult({
          success: true,
          message: 'Attendance data uploaded successfully!',
          summary: result.summary
        });
        setAttendanceFile(null);
        // Reset file input
        const fileInput = document.getElementById('attendance-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setUploadResult({
          success: false,
          message: result.error || 'Failed to upload attendance data'
        });
      }
    } catch (error) {
      console.error('Error uploading attendance:', error);
      setUploadResult({
        success: false,
        message: 'An error occurred while uploading the file'
      });
    } finally {
      setUploadingAttendance(false);
    }
  };

  const fetchStats = async () => {
    if (!dateRange) return;
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

  const handleCardClick = (metric: string) => {
    if (!weeklyKPIData) return;

    let filteredMembers: any[] = [];
    let title = '';
    let description = '';

    switch (metric) {
      case 'attendanceCompliance':
        filteredMembers = weeklyKPIData.members.filter((m: any) => !m.attendanceCompliance);
        title = 'Attendance Compliance Issues';
        description = 'Members with less than 4 days of attendance this week';
        break;
      case 'timesheetCompliance':
        filteredMembers = weeklyKPIData.members.filter((m: any) => !m.timesheetCompliance);
        title = 'Timesheet Compliance Issues';
        description = 'Members with less than 4 days of proper logging this week';
        break;
      case 'presentNotLogged':
        filteredMembers = weeklyKPIData.members.filter((m: any) =>
          m.days.some((d: any) => d.isPresent && d.clickup < 1)
        );
        title = 'Present But Not Logged';
        description = 'Members who were present but did not log time';
        break;
      case 'avgUtilization':
        filteredMembers = weeklyKPIData.members;
        title = 'Team Utilization';
        description = 'All team members with their utilization rates';
        break;
      case 'overCapacity':
        filteredMembers = weeklyKPIData.members.filter((m: any) => m.utilization > 85);
        title = 'Over Capacity Members';
        description = 'Members logging more than 85% utilization (burnout risk)';
        break;
      case 'underCapacity':
        filteredMembers = weeklyKPIData.members.filter((m: any) => m.utilization < 60);
        title = 'Under Capacity Members';
        description = 'Members logging less than 60% utilization';
        break;
    }

    setDrillDownMetric(metric);
    setDrillDownMembers(
      filteredMembers.map((m: any) => ({
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

  const handleSync = async () => {
    if (!dateRange) return;
    setSyncing(true);
    setSyncSheetOpen(false);
    try {
      // Sync team members first
      const teamResponse = await fetch('/api/sync/team-members', {
        method: 'POST',
      });
      const teamResult = await teamResponse.json();

      if (!teamResult.success) {
        throw new Error(teamResult.error);
      }

      // Use the selected date range for sync
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

      // Refresh stats and team members after sync
      await fetchStats();
      await fetchTeamMembers();

      const periodText = `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
      alert(`Sync completed successfully! Synced ${timeResult.count} time entries for ${periodText}.`);
    } catch (error) {
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <div className="container mx-auto p-6 space-y-8 max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center pb-8 border-b border-gray-200 animate-in fade-in slide-in-from-top duration-700">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              ClickUp Timesheet Analytics
            </h1>
            <p className="text-gray-600 text-sm">
              Team-level dashboard for timesheet compliance and capacity utilization
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastSync && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Last sync: {format(lastSync, 'MMM dd, yyyy HH:mm:ss')}</span>
              </div>
            )}

            {/* Reset Database Button */}
            <ResetDataButton />

            {/* Attendance Upload Button */}
            <Sheet open={attendanceSheetOpen} onOpenChange={setAttendanceSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-300"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Attendance
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="space-y-2 pb-6 border-b">
                  <SheetTitle className="text-2xl font-bold text-gray-900">Upload Attendance Sheet</SheetTitle>
                  <SheetDescription className="text-gray-600">
                    Upload your attendance XLS file and select the date range to process.
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-6">
                  {/* File Upload */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Select File</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-900 transition-colors duration-300">
                      <input
                        id="attendance-file-input"
                        type="file"
                        accept=".xls,.xlsx"
                        onChange={handleAttendanceFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="attendance-file-input"
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-3" />
                        <span className="text-sm font-medium text-gray-900 mb-1">
                          {attendanceFile ? attendanceFile.name : 'Click to upload'}
                        </span>
                        <span className="text-xs text-gray-500">
                          XLS or XLSX files only
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Date Range Selector */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Date Range</h3>
                    <CustomDateRangePicker
                      value={attendanceDateRange}
                      onChange={setAttendanceDateRange}
                    />
                    <p className="text-xs text-gray-500">
                      Only data within this date range will be processed from the file.
                    </p>
                  </div>

                  {/* Selected Period Display */}
                  {attendanceDateRange && attendanceDateRange.from && attendanceDateRange.to && (
                    <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm font-medium text-gray-900 mb-1">Selected Period</p>
                      <p className="text-sm text-gray-600">
                        {format(attendanceDateRange.from, 'MMM dd, yyyy')} - {format(attendanceDateRange.to, 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}

                  {/* Upload Result */}
                  {uploadResult && (
                    <div className={`rounded-lg p-4 border ${
                      uploadResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        {uploadResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            uploadResult.success ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {uploadResult.message}
                          </p>
                          {uploadResult.success && uploadResult.summary && (
                            <div className="mt-3 space-y-1 text-xs text-green-800">
                              <p>Total Records: {uploadResult.summary.totalRecords}</p>
                              <p>Employees: {uploadResult.summary.employeeCount}</p>
                              <p>Present: {uploadResult.summary.presentCount}</p>
                              <p>Absent: {uploadResult.summary.absentCount}</p>
                              <p>Partial: {uploadResult.summary.partialCount}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  <Button
                    onClick={handleAttendanceUpload}
                    disabled={!attendanceFile || uploadingAttendance}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 text-base font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingAttendance ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Upload Attendance Data
                      </>
                    )}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={syncSheetOpen} onOpenChange={setSyncSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  disabled={syncing}
                  className="bg-gray-900 hover:bg-gray-800 text-white transition-all duration-300 hover:shadow-lg"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Data'}
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="space-y-2 pb-6 border-b">
                  <SheetTitle className="text-2xl font-bold text-gray-900">Sync Data</SheetTitle>
                  <SheetDescription className="text-gray-600">
                    Choose a preset period or select a custom date range to sync your timesheet data.
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-6">
                  {/* Quick Actions */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('thisWeek')}
                        className="justify-start hover:bg-gray-900 hover:text-white transition-all duration-300"
                      >
                        This Week
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('lastWeek')}
                        className="justify-start hover:bg-gray-900 hover:text-white transition-all duration-300"
                      >
                        Last Week
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('thisMonth')}
                        className="justify-start hover:bg-gray-900 hover:text-white transition-all duration-300"
                      >
                        This Month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('lastMonth')}
                        className="justify-start hover:bg-gray-900 hover:text-white transition-all duration-300"
                      >
                        Last Month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('thisQuarter')}
                        className="justify-start hover:bg-gray-900 hover:text-white transition-all duration-300"
                      >
                        This Quarter
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('lastQuarter')}
                        className="justify-start hover:bg-gray-900 hover:text-white transition-all duration-300"
                      >
                        Last Quarter
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('thisYear')}
                        className="justify-start hover:bg-gray-900 hover:text-white transition-all duration-300"
                      >
                        This Year
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('lastYear')}
                        className="justify-start hover:bg-gray-900 hover:text-white transition-all duration-300"
                      >
                        Last Year
                      </Button>
                    </div>
                  </div>

                  {/* Custom Date Range */}
                  <div className="space-y-3 pt-6 border-t">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Custom Date Range</h3>
                    {dateRange && <DateRangePicker value={dateRange} onChange={setDateRange} mode={viewMode} />}
                  </div>

                  {/* Selected Period */}
                  <div className="space-y-3 pt-6 border-t">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Selected Period</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {dateRange ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : 'Loading...'}
                      </p>
                    </div>
                    <Button
                      onClick={handleSync}
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white transition-all duration-300 hover:shadow-lg"
                      size="lg"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Selected Period
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap animate-in fade-in slide-in-from-bottom duration-500 delay-150">
          <div className="flex-1 max-w-md">
            {dateRange && <DateRangePicker value={dateRange} onChange={setDateRange} mode={viewMode} />}
          </div>
          <div className="flex-1 max-w-md relative">
            <DropdownMenu open={showMemberFilter} onOpenChange={setShowMemberFilter}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between hover:bg-gray-50 transition-all duration-300 border-gray-300"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-700" />
                    <span className="font-medium text-gray-900">
                      {selectedMembers.length === teamMembers.length
                        ? 'All Team Members'
                        : `${selectedMembers.length} of ${teamMembers.length} Members`
                      }
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="start"
                className="w-[320px] max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Filter Team Members</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllMembers}
                    disabled={selectedMembers.length === teamMembers.length}
                    className="h-7 text-xs hover:bg-gray-100 transition-colors duration-200"
                  >
                    Select All
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <div className="p-2 space-y-1">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMemberSelection(member.id);
                      }}
                    >
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={isMemberSelected(member.id)}
                        onCheckedChange={() => {
                          toggleMemberSelection(member.id);
                        }}
                        className="mt-0.5"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
                      />
                      <label
                        htmlFor={`member-${member.id}`}
                        className="flex-1 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          {member.profilePicture ? (
                            <img
                              src={member.profilePicture}
                              alt={member.username}
                              className="w-7 h-7 rounded-full"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold">
                              {member.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {member.username}
                            </p>
                            {member.email && (
                              <p className="text-xs text-gray-500 truncate">
                                {member.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                <DropdownMenuSeparator />
                <div className="p-2">
                  <p className="text-xs text-gray-500 text-center">
                    {selectedMembers.length} of {teamMembers.length} members selected
                  </p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm text-gray-500">
            {dateRange ? (
              viewMode === 'week'
                ? `Week of ${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMMM yyyy')
            ) : 'Loading...'}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="animate-in fade-in slide-in-from-bottom duration-500 delay-200 hover:shadow-xl transition-all duration-300 border-2 border-gray-100 hover:border-gray-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Team Members</CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-900" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900 tracking-tight">
                {stats.totalTeamMembers}
              </div>
              <p className="text-sm text-gray-500 mt-1">Active team members</p>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom duration-500 delay-300 hover:shadow-xl transition-all duration-300 border-2 border-gray-100 hover:border-gray-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Compliance Rate</CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-gray-900" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900 tracking-tight">
                {stats.complianceRate}%
              </div>
              <p className="text-sm text-gray-500 mt-1">Selected period</p>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom duration-500 delay-400 hover:shadow-xl transition-all duration-300 border-2 border-gray-100 hover:border-gray-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg Utilization</CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-gray-900" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900 tracking-tight">
                {stats.avgUtilization}%
              </div>
              <p className="text-sm text-gray-500 mt-1">Team average</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly KPI Cards - Only show for week view */}
        {viewMode === 'week' && weeklyKPIData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500 delay-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <WeeklyKPICards kpiData={weeklyKPIData.kpi} onCardClick={handleCardClick} />
              </div>
              <div>
                <RiskSignalsCard signals={weeklyKPIData.riskSignals} insights={weeklyKPIData.insights} />
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Existing Tabs */}
        <Tabs
          defaultValue="week"
          className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500 delay-500"
          onValueChange={(value) => handleViewModeChange(value as 'week' | 'month' | 'team')}
        >
          <TabsList className="bg-gray-100 p-1 border border-gray-200">
            <TabsTrigger
              value="week"
              className="data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-all duration-300 font-medium"
            >
              Week View
            </TabsTrigger>
            <TabsTrigger
              value="month"
              className="data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-all duration-300 font-medium"
            >
              Month View
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-all duration-300 font-medium"
            >
              Team Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="space-y-4">
            {dateRange && <TimesheetGridView dateRange={dateRange} selectedMembers={selectedMembers} />}
          </TabsContent>

          <TabsContent value="month" className="space-y-4">
            {dateRange && <MonthGridView dateRange={dateRange} selectedMembers={selectedMembers} />}
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <TeamOverview selectedMembers={selectedMembers} />
          </TabsContent>
        </Tabs>

        {/* Drill-down Sheet */}
        {weeklyKPIData && (
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
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '../dashboard-context';
import { WeeklyKPICards } from '@/components/dashboard/weekly-kpi-cards';
import { TimesheetGridView } from '@/components/dashboard/timesheet-grid-view';
import { KPIDrillDownSheet } from '@/components/dashboard/kpi-drill-down-sheet';
import { DateRangePresetPicker } from '@/components/ui/date-range-preset-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export default function WeeklyLogsPage() {
    const { weeklyKPIData, dateRange, setDateRange, teamMembers, selectedMembers, setSelectedMembers, refreshData, isLoading } = useDashboard();

    // Track client-side mounting to prevent hydration mismatch
    const [isMounted, setIsMounted] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);

    // Set mounted after client-side hydration
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Drill Down State
    const [drillDownOpen, setDrillDownOpen] = useState(false);
    const [drillDownMetric, setDrillDownMetric] = useState<string>('');
    const [drillDownMembers, setDrillDownMembers] = useState<any[]>([]);

    // Filtered team members based on search
    const filteredTeamMembers = useMemo(() => {
        return teamMembers.filter((member) =>
            member.username.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [teamMembers, searchQuery]);

    const handleCardClick = (metric: string) => {
        if (!weeklyKPIData) return;

        let filteredMembers: any[] = [];

        switch (metric) {
            case 'attendanceCompliance':
                filteredMembers = weeklyKPIData.members.filter((m: any) => !m.attendanceCompliance);
                break;
            case 'timesheetCompliance':
                filteredMembers = weeklyKPIData.members.filter((m: any) => !m.timesheetCompliance);
                break;
            case 'presentNotLogged':
                filteredMembers = weeklyKPIData.members.filter((m: any) =>
                    m.days.some((d: any) => d.isPresent && d.clickup < 1)
                );
                break;
            case 'avgUtilization':
                filteredMembers = weeklyKPIData.members;
                break;
            case 'overCapacity':
                filteredMembers = weeklyKPIData.members.filter((m: any) => m.utilization > 85);
                break;
            case 'underCapacity':
                filteredMembers = weeklyKPIData.members.filter((m: any) => m.utilization < 60);
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

    const handleToggleMember = (memberId: string) => {
        if (selectedMembers.includes(memberId)) {
            setSelectedMembers(selectedMembers.filter(id => id !== memberId));
        } else {
            setSelectedMembers([...selectedMembers, memberId]);
        }
    };

    const handleSelectAll = () => {
        setSelectedMembers(filteredTeamMembers.map(m => m.id));
    };

    const handleDeselectAll = () => {
        setSelectedMembers([]);
    };

    const handlePreviousWeek = () => {
        if (!dateRange?.from) return;
        const newStart = new Date(dateRange.from);
        newStart.setDate(newStart.getDate() - 7);
        const newEnd = new Date(dateRange.to || dateRange.from);
        newEnd.setDate(newEnd.getDate() - 7);
        setDateRange({ from: newStart, to: newEnd });
    };

    const handleNextWeek = () => {
        if (!dateRange?.from) return;
        const newStart = new Date(dateRange.from);
        newStart.setDate(newStart.getDate() + 7);
        const newEnd = new Date(dateRange.to || dateRange.from);
        newEnd.setDate(newEnd.getDate() + 7);
        setDateRange({ from: newStart, to: newEnd });
    };

    const getDisplayText = () => {
        // During SSR, always return placeholder to match server render
        if (!isMounted) return 'Loading...';

        if (selectedMembers.length === 0) return 'No members selected';
        if (selectedMembers.length === teamMembers.length) return 'All members';
        return `${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''} selected`;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Weekly Logs</h2>
                    <p className="text-muted-foreground">Detailed weekly timesheet and attendance analysis.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Team Members Filter Dropdown */}
                    <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[220px] justify-between">
                                <span className="truncate">{getDisplayText()}</span>
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="end">
                            <div className="flex flex-col">
                                {/* Search Bar */}
                                <div className="p-3 border-b">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 h-9"
                                        />
                                    </div>
                                </div>

                                {/* Header with Select/Deselect All */}
                                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {teamMembers.length} People
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={selectedMembers.length === filteredTeamMembers.length ? handleDeselectAll : handleSelectAll}
                                    >
                                        {selectedMembers.length === filteredTeamMembers.length ? 'Deselect All' : 'Select All'}
                                    </Button>
                                </div>

                                {/* Team Members List */}
                                <div className="max-h-[300px] overflow-y-auto">
                                    {filteredTeamMembers.map((member) => {
                                        const isSelected = selectedMembers.includes(member.id);
                                        const initials = member.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                                        return (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                                                onClick={() => handleToggleMember(member.id)}
                                            >
                                                {/* Avatar */}
                                                {member.profilePicture ? (
                                                    <img
                                                        src={member.profilePicture}
                                                        alt={member.username}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                                                        {initials}
                                                    </div>
                                                )}

                                                {/* Name */}
                                                <span className="flex-1 text-sm font-medium">{member.username}</span>

                                                {/* Checkbox */}
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected
                                                    ? 'bg-blue-600 border-blue-600'
                                                    : 'border-gray-300'
                                                    }`}>
                                                    {isSelected && (
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {filteredTeamMembers.length === 0 && (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        No members found
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Week Navigation */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePreviousWeek}
                            title="Previous week"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <DateRangePresetPicker date={dateRange} setDate={setDateRange} />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNextWeek}
                            title="Next week"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button variant="outline" size="icon" onClick={refreshData} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            {weeklyKPIData && (
                <WeeklyKPICards kpiData={weeklyKPIData.kpi} onCardClick={handleCardClick} />
            )}

            {/* Timesheet Grid */}
            {dateRange && dateRange.from && dateRange.to && (
                <TimesheetGridView
                    dateRange={{ from: dateRange.from, to: dateRange.to }}
                    selectedMembers={selectedMembers}
                />
            )}

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

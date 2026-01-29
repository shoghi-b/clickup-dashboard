'use client';

import { useState } from 'react';
import { useDashboard } from '../dashboard-context';
import { WeeklyKPICards } from '@/components/dashboard/weekly-kpi-cards';
import { TimesheetGridView } from '@/components/dashboard/timesheet-grid-view';
import { KPIDrillDownSheet } from '@/components/dashboard/kpi-drill-down-sheet';
import { DateRangePresetPicker } from '@/components/ui/date-range-preset-picker';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function WeeklyLogsPage() {
    const { weeklyKPIData, dateRange, setDateRange, teamMembers, selectedMembers, refreshData, isLoading } = useDashboard();

    // Drill Down State
    const [drillDownOpen, setDrillDownOpen] = useState(false);
    const [drillDownMetric, setDrillDownMetric] = useState<string>('');
    const [drillDownMembers, setDrillDownMembers] = useState<any[]>([]);

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

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Weekly Logs</h2>
                    <p className="text-muted-foreground">Detailed weekly timesheet and attendance analysis.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePresetPicker date={dateRange} setDate={setDateRange} />
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

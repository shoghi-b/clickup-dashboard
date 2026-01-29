'use client';

import { useDashboard } from '../dashboard-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { RiskSignalsCard } from '@/components/dashboard/risk-signals-card';
import { DateRangePresetPicker } from '@/components/ui/date-range-preset-picker';

export default function OverviewPage() {
    const { stats, weeklyKPIData, dateRange, setDateRange } = useDashboard();

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
                    <p className="text-muted-foreground">High-level metrics and risk signals.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePresetPicker date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            {/* Top Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Members</CardTitle>
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
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.complianceRate}%</div>
                        <p className="text-xs text-muted-foreground">Timesheet submission rate</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgUtilization}%</div>
                        <p className="text-xs text-muted-foreground">Average capacity usage</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</div>
                        <p className="text-xs text-muted-foreground">Total logged hours</p>
                    </CardContent>
                </Card>
            </div>

            {/* Risk Signals */}
            {weeklyKPIData && (
                <div className="grid gap-6 md:grid-cols-1">
                    <RiskSignalsCard
                        signals={weeklyKPIData.riskSignals}
                        insights={weeklyKPIData.insights}
                    />
                </div>
            )}
        </div>
    );
}

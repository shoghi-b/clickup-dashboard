'use client';

import { useDashboard } from '../dashboard-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { RiskSignalsCard } from '@/components/dashboard/risk-signals-card';
import { DateRangePresetPicker } from '@/components/ui/date-range-preset-picker';
import { DiscrepancyDetailsSheet } from '@/components/dashboard/discrepancy-details-sheet';
import { ResolveDiscrepancySheet } from '@/components/dashboard/resolve-discrepancy-sheet';
import { useState, useEffect } from 'react';
import type { Discrepancy, DiscrepancyRule, DiscrepancySummary } from '@/lib/types/discrepancy';
import { startOfWeek } from 'date-fns';

export default function OverviewPage() {
    const { stats, weeklyKPIData, dateRange, setDateRange } = useDashboard();

    // Discrepancy state
    const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
    const [discrepancySummary, setDiscrepancySummary] = useState<DiscrepancySummary[]>([]);
    const [selectedRule, setSelectedRule] = useState<DiscrepancyRule | null>(null);
    const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
    const [resolveSheetOpen, setResolveSheetOpen] = useState(false);
    const [discrepancyToResolve, setDiscrepancyToResolve] = useState<Discrepancy | null>(null);
    const [resolveNote, setResolveNote] = useState('');

    // Fetch discrepancies when date range changes
    useEffect(() => {
        const fetchDiscrepancies = async () => {
            if (!dateRange?.from) return;

            try {
                const weekStart = startOfWeek(dateRange.from, { weekStartsOn: 1 });
                const response = await fetch(`/api/discrepancies?weekStart=${weekStart.toISOString()}&status=open`);
                const result = await response.json();

                if (result.success) {
                    setDiscrepancies(result.data.discrepancies);
                    setDiscrepancySummary(result.data.summary);
                }
            } catch (error) {
                console.error('Error fetching discrepancies:', error);
            }
        };

        fetchDiscrepancies();
    }, [dateRange]);

    // Handle discrepancy click
    const handleDiscrepancyClick = (rule: DiscrepancyRule) => {
        setSelectedRule(rule);
        setDetailsSheetOpen(true);
    };

    // Handle resolve discrepancy
    const handleResolve = (discrepancy: Discrepancy, initialNote?: string) => {
        setDiscrepancyToResolve(discrepancy);
        setResolveNote(initialNote || '');
        setDetailsSheetOpen(false);
        setResolveSheetOpen(true);
    };

    // Handle resolve submit
    const handleResolveSubmit = async (note: string) => {
        if (!discrepancyToResolve) return;

        try {
            const response = await fetch('/api/discrepancies/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    discrepancyId: discrepancyToResolve.id,
                    note,
                }),
            });

            const result = await response.json();
            if (result.success) {
                // Refresh discrepancies
                const weekStart = dateRange?.from ? startOfWeek(dateRange.from, { weekStartsOn: 1 }) : new Date();
                const refreshResponse = await fetch(`/api/discrepancies?weekStart=${weekStart.toISOString()}&status=open`);
                const refreshResult = await refreshResponse.json();

                if (refreshResult.success) {
                    setDiscrepancies(refreshResult.data.discrepancies);
                    setDiscrepancySummary(refreshResult.data.summary);
                }

                setResolveSheetOpen(false);
                setDiscrepancyToResolve(null);
                setResolveNote('');
            }
        } catch (error) {
            console.error('Error resolving discrepancy:', error);
        }
    };

    // Get filtered discrepancies for selected rule
    const filteredDiscrepancies = selectedRule
        ? discrepancies.filter(d => d.rule === selectedRule && d.status === 'open')
        : [];

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
                        discrepancies={discrepancySummary}
                        onDiscrepancyClick={handleDiscrepancyClick}
                    />
                </div>
            )}

            {/* Discrepancy Details Sheet */}
            <DiscrepancyDetailsSheet
                open={detailsSheetOpen}
                onOpenChange={setDetailsSheetOpen}
                rule={selectedRule}
                discrepancies={filteredDiscrepancies}
                onResolve={handleResolve}
            />

            {/* Resolve Discrepancy Sheet */}
            <ResolveDiscrepancySheet
                open={resolveSheetOpen}
                onOpenChange={setResolveSheetOpen}
                discrepancy={discrepancyToResolve}
                initialNote={resolveNote}
                onSubmit={handleResolveSubmit}
            />
        </div>
    );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus as MinusIcon, BarChart3 } from 'lucide-react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { TrendSparkline } from './trend-sparkline';
import { TrendIndicator } from './trend-indicator';
import { MultiMemberChart } from './multi-member-chart';
import { ReportPeriodSelector } from './report-period-selector';
import { MemberSelector } from './member-selector';
import type { MemberTrendReport, TrendAnalysisSummary, TrendPeriod, ReportPeriod } from '@/lib/types/report';

interface DateRange {
    from: Date;
    to: Date;
}

interface TrendAnalysisViewProps {
    teamMembers: Array<{ id: string; username: string; profilePicture: string | null }>;
}

const STORAGE_KEY = 'trend_selected_members';

export function TrendAnalysisView({ teamMembers }: TrendAnalysisViewProps) {
    const [loading, setLoading] = useState(false);
    // Initialize with default 7 days range to match ReportPeriodSelector default
    const [dateRange, setDateRange] = useState<DateRange | null>(() => {
        const today = new Date();
        return {
            from: startOfDay(subDays(today, 6)),
            to: endOfDay(today)
        };
    });
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [trendReports, setTrendReports] = useState<MemberTrendReport[]>([]);
    const [summary, setSummary] = useState<TrendAnalysisSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load persisted selection
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setSelectedMemberIds(parsed);
                }
            } catch (e) {
                console.error('Failed to load trend members', e);
            }
        }
        setIsInitialized(true);
    }, []);

    const handleSelectionChange = (ids: string[]) => {
        setSelectedMemberIds(ids);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    };

    const handlePeriodChange = (period: ReportPeriod, range: DateRange) => {
        setDateRange(range);
    };

    const handleGenerateTrends = async () => {
        if (!dateRange || selectedMemberIds.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            // Calculate weeks based on date range
            const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const weeks = Math.ceil(diffDays / 7);

            let trendWeeks: TrendPeriod = 8;
            if (weeks <= 4) trendWeeks = 4;
            else if (weeks <= 8) trendWeeks = 8;
            else trendWeeks = 12;

            const params = new URLSearchParams({
                memberIds: selectedMemberIds.join(','),
                weeks: trendWeeks.toString(),
            });

            const response = await fetch(`/api/reports/trend-analysis?${params}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to generate trend analysis');
            }

            setTrendReports(result.data);
            setSummary(result.summary);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error generating trend analysis:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'improving':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'declining':
                return 'bg-red-100 text-red-800 border-red-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'improving':
                return <TrendingUp className="h-4 w-4" />;
            case 'declining':
                return <TrendingDown className="h-4 w-4" />;
            default:
                return <MinusIcon className="h-4 w-4" />;
        }
    };

    if (!isInitialized) return null; // Avoid hydration mismatch

    return (
        <div className="space-y-6">
            {/* Configuration Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Report Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="min-w-[240px] flex-1">
                            <label className="text-sm font-medium mb-2 block">Team Members</label>
                            <MemberSelector
                                members={teamMembers}
                                selectedMemberIds={selectedMemberIds}
                                onSelectionChange={handleSelectionChange}
                                placeholder="Select members for analysis"
                            />
                        </div>

                        <div className="min-w-[240px] flex-1">
                            <label className="text-sm font-medium mb-2 block">Analysis Period</label>
                            <ReportPeriodSelector onPeriodChange={handlePeriodChange} />
                        </div>

                        <Button
                            className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
                            onClick={handleGenerateTrends}
                            disabled={loading || !dateRange || selectedMemberIds.length === 0}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    Generate Analysis
                                </>
                            )}
                        </Button>
                    </div>

                    {selectedMemberIds.length === 0 && (
                        <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 inline-block">
                            Please select at least one team member to analyze.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Empty State */}
            {trendReports.length === 0 && !loading && (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No Analysis Generated</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mt-1">
                        Select a period and team members above, then click "Generate Analysis" to view trends.
                    </p>
                </div>
            )}

            {/* Summary Cards */}
            {summary && trendReports.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Members</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.totalMembers}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-500">Improving</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{summary.improvingMembers}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-500">Declining</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{summary.decliningMembers}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-500">Stable</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-600">{summary.stableMembers}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Analyzing trends...</span>
                </div>
            )}

            {/* Error State */}
            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <p className="text-red-600">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Trend Table */}
            {!loading && !error && trendReports.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Member Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2">
                                        <th className="text-left p-3 font-medium text-gray-700">Member</th>
                                        <th className="text-center p-3 font-medium text-gray-700">Late Check-ins</th>
                                        <th className="text-center p-3 font-medium text-gray-700">Super Late</th>
                                        <th className="text-center p-3 font-medium text-gray-700">Insufficient Hours</th>
                                        <th className="text-center p-3 font-medium text-gray-700">&lt;8h Office</th>
                                        <th className="text-center p-3 font-medium text-gray-700">Trend</th>
                                        <th className="text-center p-3 font-medium text-gray-700">Overall Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trendReports.map((report) => (
                                        <tr key={report.memberId} className="border-b hover:bg-gray-50">
                                            <td className="p-3">
                                                <div className="font-medium">{report.memberName}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <TrendIndicator trend={report.trends.lateCheckins} compact />
                                                    <div className="w-20">
                                                        <TrendSparkline
                                                            data={report.weeklyData.map(w => w.metrics.lateCheckins)}
                                                            color={report.trends.lateCheckins.direction === 'improving' ? '#16a34a' : '#dc2626'}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <TrendIndicator trend={report.trends.superLateCheckins} compact />
                                                    <div className="w-20">
                                                        <TrendSparkline
                                                            data={report.weeklyData.map(w => w.metrics.superLateCheckins)}
                                                            color={report.trends.superLateCheckins.direction === 'improving' ? '#16a34a' : '#dc2626'}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <TrendIndicator trend={report.trends.insufficientHoursBoth} compact />
                                                    <div className="w-20">
                                                        <TrendSparkline
                                                            data={report.weeklyData.map(w => w.metrics.insufficientHoursBoth)}
                                                            color={report.trends.insufficientHoursBoth.direction === 'improving' ? '#16a34a' : '#dc2626'}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <TrendIndicator trend={report.trends.lessThan8hOffice} compact />
                                                    <div className="w-20">
                                                        <TrendSparkline
                                                            data={report.weeklyData.map(w => w.metrics.lessThan8hOffice)}
                                                            color={report.trends.lessThan8hOffice.direction === 'improving' ? '#16a34a' : '#dc2626'}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="text-xs text-gray-600">
                                                    Avg: {report.trends.lateCheckins.averageValue.toFixed(1)}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={`${getStatusColor(report.overallStatus)} gap-1`}>
                                                    {getStatusIcon(report.overallStatus)}
                                                    <span className="capitalize">{report.overallStatus}</span>
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Multi-Member Comparison Chart */}
            {!loading && !error && trendReports.length > 0 && (
                <MultiMemberChart reports={trendReports} />
            )}
        </div>
    );
}

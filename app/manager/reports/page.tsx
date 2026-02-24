'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileDown, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ReportPeriodSelector } from '@/components/dashboard/report-period-selector';
import { MetricDetailsSheet } from '@/components/dashboard/metric-details-sheet';
import { TrendAnalysisView } from '@/components/dashboard/trend-analysis-view';
import { MemberSelector } from '@/components/dashboard/member-selector';
import { generatePDF } from '@/components/dashboard/report-pdf-export';
import type { MemberComplianceReport, ReportPeriod, DateDetail, ReportSummary } from '@/lib/types/report';
import { useDashboard } from '../dashboard-context';

interface DateRange {
    from: Date;
    to: Date;
}

const STORAGE_KEY = 'compliance_selected_members';

export default function ReportsPage() {
    const { teamMembers, visibleMembers } = useDashboard();

    // Only show master-visible members in the report selectors
    const visibleTeamMembers = teamMembers.filter(m => visibleMembers.includes(m.id));
    const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('7_DAYS');
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [reports, setReports] = useState<MemberComplianceReport[]>([]);
    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState<{
        memberName: string;
        metricName: string;
        dates: DateDetail[] | string[];
    } | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load persisted selection, filtered to only master-visible members
    useEffect(() => {
        if (visibleMembers.length === 0) return; // wait until visibleMembers is loaded
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    // Filter out any members no longer in the master-visible list
                    const filtered = parsed.filter((id: string) => visibleMembers.includes(id));
                    setSelectedMembers(filtered);
                }
            } catch (e) {
                console.error('Failed to load compliance members', e);
            }
        } else {
            // No saved selection — seed from master-visible members
            setSelectedMembers(visibleMembers);
        }
        setIsInitialized(true);
    }, [visibleMembers]);

    const handleSelectionChange = (ids: string[]) => {
        setSelectedMembers(ids);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    };

    const handlePeriodChange = (period: ReportPeriod, range: DateRange) => {
        setSelectedPeriod(period);
        setDateRange(range);
    };

    const handleGenerateReport = async () => {
        if (!dateRange || selectedMembers.length === 0) {
            alert('Please select a period and at least one team member');
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({
                memberIds: selectedMembers.join(','),
                startDate: format(dateRange.from, 'yyyy-MM-dd'),
                endDate: format(dateRange.to, 'yyyy-MM-dd'),
            });

            const response = await fetch(`/api/reports/member-compliance?${params}`);
            const result = await response.json();

            if (result.success) {
                setReports(result.data);
                setSummary(result.summary);
            } else {
                alert(`Error: ${result.error} `);
            }
        } catch (error) {
            console.error('Failed to generate report:', error);
            alert('Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const handleMetricClick = (
        memberName: string,
        metricName: string,
        dates: DateDetail[] | string[]
    ) => {
        setSelectedMetric({ memberName, metricName, dates });
        setDetailsOpen(true);
    };

    const handleExportPDF = async () => {
        if (!summary || reports.length === 0) return;

        setExportingPDF(true);
        try {
            const periodLabel = selectedPeriod.replace(/_/g, ' ');
            await generatePDF(reports, summary, periodLabel);
        } catch (error) {
            console.error('Failed to export PDF:', error);
            alert('Failed to export PDF. Please try again.');
        } finally {
            setExportingPDF(false);
        }
    };

    // Color coding for metrics
    const getMetricColor = (value: number, metricType: string): string => {
        if (value === 0) return 'text-green-600 border-green-600';

        switch (metricType) {
            case 'late':
                return value > 3 ? 'text-red-600 border-red-600' : 'text-yellow-600 border-yellow-600';
            case 'superLate':
                return value > 3 ? 'text-red-700 border-red-700' : 'text-red-500 border-red-500';
            case 'insufficient':
                return value > 3 ? 'text-red-600 border-red-600' : 'text-orange-600 border-orange-600';
            case 'outside':
                return value > 2 ? 'text-blue-700 border-blue-700' : 'text-blue-500 border-blue-500';
            case 'noDataDays':
                return value > 2 ? 'text-gray-700 border-gray-700' : 'text-gray-500 border-gray-500';
            case 'superLateOffice':
                return value > 2 ? 'text-purple-700 border-purple-700' : 'text-purple-500 border-purple-500';
            case 'superLateOfficeGood':
                return value > 2 ? 'text-green-700 border-green-700' : 'text-green-500 border-green-500';
            case 'lessThan8hOffice':
                return value > 3 ? 'text-amber-700 border-amber-700' : 'text-amber-500 border-amber-500';
            default:
                return 'text-gray-600 border-gray-600';
        }
    };

    if (!isInitialized) return null; // Avoid hydration mismatch

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Compliance Reports</h1>
                <p className="text-gray-500 mt-1">
                    Generate detailed compliance reports and trend analysis for team members
                </p>
            </div>

            <Tabs defaultValue="compliance" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="compliance">Compliance Report</TabsTrigger>
                    <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
                </TabsList>

                <TabsContent value="compliance" className="space-y-6">
                    {/* Filters */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Report Filters</CardTitle>
                            <CardDescription>Select period and team members to generate report</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-end gap-4 flex-wrap">
                                {/* Period Selector */}
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Period</label>
                                    <ReportPeriodSelector onPeriodChange={handlePeriodChange} />
                                </div>

                                {/* Team Member Selector */}
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Team Members</label>
                                    <MemberSelector
                                        members={visibleTeamMembers}
                                        selectedMemberIds={selectedMembers}
                                        onSelectionChange={handleSelectionChange}
                                        placeholder="Select members for report"
                                    />
                                </div>

                                {/* Generate Button */}
                                <div className="flex items-end">
                                    <Button
                                        onClick={handleGenerateReport}
                                        disabled={loading || !dateRange || selectedMembers.length === 0}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            'Generate Report'
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {dateRange && (
                                <div className="text-sm text-gray-600">
                                    Report period: <span className="font-medium">
                                        {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Report Results */}
                    {reports.length > 0 && summary && (
                        <>
                            {/* Summary Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Report Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{summary.totalMembers}</div>
                                            <div className="text-sm text-gray-500">Members</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-yellow-600">{summary.aggregateMetrics.totalLateCheckins}</div>
                                            <div className="text-sm text-gray-500">Late Check-ins</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">{summary.aggregateMetrics.totalSuperLateCheckins}</div>
                                            <div className="text-sm text-gray-500">Super Late</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-orange-600">{summary.aggregateMetrics.totalInsufficientHoursBoth}</div>
                                            <div className="text-sm text-gray-500">Insufficient Hours</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">{summary.aggregateMetrics.totalOutsideOfficeWork}</div>
                                            <div className="text-sm text-gray-500">Outside Work</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600">{summary.aggregateMetrics.totalSuperLateWithOfficeButLowWork}</div>
                                            <div className="text-sm text-gray-500">SL+8h Office<br />&lt;8h Work</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">{summary.aggregateMetrics.totalSuperLateWithOfficeAndGoodWork}</div>
                                            <div className="text-sm text-gray-500">SL+8h Office<br />8h+ Work</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-amber-600">{summary.aggregateMetrics.totalLessThan8hOffice}</div>
                                            <div className="text-sm text-gray-500">&lt;8h Office</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Compliance Table */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Compliance Details</CardTitle>
                                        <CardDescription>Click on any metric to see detailed dates</CardDescription>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleExportPDF}
                                        disabled={exportingPDF}
                                    >
                                        {exportingPDF ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Exporting...
                                            </>
                                        ) : (
                                            <>
                                                <FileDown className="mr-2 h-4 w-4" />
                                                Export to PDF
                                            </>
                                        )}
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="border-b-2">
                                                    <th className="text-left p-3 font-medium text-gray-700">Member</th>
                                                    <th className="text-center p-3 font-medium text-gray-700">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span>Late Check-ins</span>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">Check-ins after 10:30 AM but before 10:45 AM</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </th>
                                                    <th className="text-center p-3 font-medium text-gray-700">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span>Super Late</span>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">Check-ins after 10:45 AM</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </th>
                                                    <th className="text-center p-3 font-medium text-gray-700">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span>Insufficient Hours</span>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">Days with less than 8 hours in both office attendance AND ClickUp work</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </th>
                                                    <th className="text-center p-3 font-medium text-gray-700">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span>Outside Work</span>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">Days with less than 8 hours office attendance but 8+ hours ClickUp work (remote work)</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </th>
                                                    <th className="text-center p-3 font-medium text-gray-700">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span>No Data Days</span>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">Days with no attendance record and no ClickUp activity (potential leave/absence)</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </th>
                                                    <th className="text-center p-3 font-medium text-gray-700">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span>SL + 8h Office + &lt;8h Work</span>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">Super late arrival (after 10:45 AM) but stayed 8+ hours in office, yet worked less than 8 hours on ClickUp</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </th>
                                                    <th className="text-center p-3 font-medium text-gray-700">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span>SL + 8h Office + 8h+ Work</span>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">Super late arrival (after 10:45 AM) but stayed 8+ hours in office AND worked 8+ hours on ClickUp</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </th>
                                                    <th className="text-center p-3 font-medium text-gray-700">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span>&lt;8h Office</span>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs">Days with less than 8 hours in office (regardless of ClickUp hours worked)</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reports.map(report => (
                                                    <tr key={report.memberId} className="border-b hover:bg-gray-50">
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2">
                                                                {report.profilePicture ? (
                                                                    <img
                                                                        src={report.profilePicture}
                                                                        alt={report.memberName}
                                                                        className="w-8 h-8 rounded-full"
                                                                    />
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                                                                        {report.memberName.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <span className="font-medium">{report.memberName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={`cursor-pointer ${getMetricColor(report.metrics.lateCheckins, 'late')}`}
                                                                onClick={() => handleMetricClick(report.memberName, 'Late Check-ins', report.metrics.lateCheckinDates)}
                                                            >
                                                                {report.metrics.lateCheckins}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={`cursor-pointer ${getMetricColor(report.metrics.superLateCheckins, 'superLate')}`}
                                                                onClick={() => handleMetricClick(report.memberName, 'Super Late Check-ins', report.metrics.superLateCheckinDates)}
                                                            >
                                                                {report.metrics.superLateCheckins}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={`cursor-pointer ${getMetricColor(report.metrics.insufficientHoursBoth, 'insufficient')}`}
                                                                onClick={() => handleMetricClick(report.memberName, 'Insufficient Hours', report.metrics.insufficientHoursDates)}
                                                            >
                                                                {report.metrics.insufficientHoursBoth}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={`cursor-pointer ${getMetricColor(report.metrics.outsideOfficeWork, 'outside')}`}
                                                                onClick={() => handleMetricClick(report.memberName, 'Outside Office Work', report.metrics.outsideWorkDates)}
                                                            >
                                                                {report.metrics.outsideOfficeWork}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={`cursor-pointer ${getMetricColor(report.metrics.noDataDays, 'noDataDays')}`}
                                                                onClick={() => handleMetricClick(report.memberName, 'No Data Days', report.metrics.noDataDates)}
                                                            >
                                                                {report.metrics.noDataDays}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={`cursor-pointer ${getMetricColor(report.metrics.superLateWithOfficeButLowWork, 'superLateOffice')}`}
                                                                onClick={() => handleMetricClick(report.memberName, 'Super Late + 8h Office + <8h Work', report.metrics.superLateWithOfficeButLowWorkDates)}
                                                            >
                                                                {report.metrics.superLateWithOfficeButLowWork}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={`cursor-pointer ${getMetricColor(report.metrics.superLateWithOfficeAndGoodWork, 'superLateOfficeGood')}`}
                                                                onClick={() => handleMetricClick(report.memberName, 'Super Late + 8h Office + 8h+ Work', report.metrics.superLateWithOfficeAndGoodWorkDates)}
                                                            >
                                                                {report.metrics.superLateWithOfficeAndGoodWork}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={`cursor-pointer ${getMetricColor(report.metrics.lessThan8hOffice, 'lessThan8hOffice')}`}
                                                                onClick={() => handleMetricClick(report.memberName, 'Less than 8h Office', report.metrics.lessThan8hOfficeDates)}
                                                            >
                                                                {report.metrics.lessThan8hOffice}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* Empty State */}
                    {reports.length === 0 && !loading && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-gray-500">
                                    Select a period and team members, then click "Generate Report" to view compliance data.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                </TabsContent>

                <TabsContent value="trends">
                    <TrendAnalysisView
                        teamMembers={visibleTeamMembers}
                    />
                </TabsContent>
            </Tabs>

            {/* Metric Details Sheet */}
            <MetricDetailsSheet
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                memberName={selectedMetric?.memberName || ''}
                metricName={selectedMetric?.metricName || ''}
                dates={selectedMetric?.dates || []}
            />
        </div>
    );
}

'use client';

import React, { useState, useRef } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MemberTrendReport, ComplianceMetrics } from '@/lib/types/report';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, CalendarDays, CalendarRange } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MultiMemberChartProps {
    reports: MemberTrendReport[];
}

const METRIC_COLORS = {
    'Late Check-ins': '#eab308',
    'Super Late': '#dc2626',
    'Insufficient Hours': '#f97316',
    '<8h Office': '#d97706',
};

// Define line styles for members to distinguish them when sharing colors
const MEMBER_STYLES = [
    '0',            // Solid
    '5 5',          // Dashed
    '2 2',          // Dotted
    '10 5',         // Long Dash
    '20 5',         // Very Long Dash
    '5 2 2 2',      // Dash Dot
    '10 2 2 2',     // Long Dash Dot
    '1 4',          // Sparse Dotted
];

const MEMBER_COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ec4899', // pink
    '#14b8a6', // teal
    '#6366f1', // indigo
    '#06b6d4', // cyan
];

type MetricKey = keyof typeof METRIC_COLORS;

export function MultiMemberChart({ reports }: MultiMemberChartProps) {
    const [selectedMemberId, setSelectedMemberId] = useState<string>(
        reports.length > 0 ? reports[0].memberId : ''
    );
    const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricKey>>(
        new Set(['Late Check-ins', 'Super Late'])
    );
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
    const chartRef = useRef<HTMLDivElement>(null);

    const handleExport = async (formatType: 'png' | 'pdf') => {
        if (!chartRef.current) return;
        try {
            const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: '#ffffff' });
            if (formatType === 'png') {
                const link = document.createElement('a');
                link.download = `trend-analysis-${format(new Date(), 'yyyy-MM-dd')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } else if (formatType === 'pdf') {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`trend-analysis-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            }
        } catch (error) { console.error('Export failed:', error); }
    };

    const toggleMetric = (metric: MetricKey) => {
        const newSelected = new Set(selectedMetrics);
        if (newSelected.has(metric)) {
            newSelected.delete(metric);
        } else {
            newSelected.add(metric);
        }
        setSelectedMetrics(newSelected);
    };

    // Prepare data for multi-member, multi-metric comparison
    const prepareComparisonData = () => {
        if (reports.length === 0) return [];

        // Get all unique weeks across all members with their start dates for sorting
        const weekMap = new Map<string, Date>();
        reports.forEach(report => {
            report.weeklyData.forEach(week => {
                if (!weekMap.has(week.weekLabel)) {
                    // Start dates come as strings from API JSON
                    weekMap.set(week.weekLabel, new Date(week.weekStart));
                }
            });
        });

        // Sort weeks by start date
        const sortedWeeks = Array.from(weekMap.entries())
            .sort((a, b) => a[1].getTime() - b[1].getTime())
            .map(entry => entry[0]);

        return sortedWeeks.map(weekLabel => {
            // Find week data to get specific dates for formatted label
            let formattedLabel = weekLabel;
            for (const report of reports) {
                const week = report.weeklyData.find(w => w.weekLabel === weekLabel);
                if (week) {
                    const start = new Date(week.weekStart);
                    const end = new Date(week.weekEnd);
                    formattedLabel = `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
                    break;
                }
            }

            const dataPoint: any = { label: formattedLabel };

            const selectedReport = reports.find(r => r.memberId === selectedMemberId);
            if (selectedReport) {
                const weekData = selectedReport.weeklyData.find(w => w.weekLabel === weekLabel);
                if (weekData) {
                    selectedMetrics.forEach(metric => {
                        let value = 0;
                        switch (metric) {
                            case 'Late Check-ins':
                                value = weekData.metrics.lateCheckins;
                                break;
                            case 'Super Late':
                                value = weekData.metrics.superLateCheckins;
                                break;
                            case 'Insufficient Hours':
                                value = weekData.metrics.insufficientHoursBoth;
                                break;
                            case '<8h Office':
                                value = weekData.metrics.lessThan8hOffice;
                                break;
                        }
                        dataPoint[metric] = value;
                    });
                }
            }

            return dataPoint;
        });
    };

    const prepareDailyData = () => {
        const selectedReport = reports.find(r => r.memberId === selectedMemberId);
        if (!selectedReport || selectedReport.weeklyData.length === 0) return [];

        const dailyMap = new Map<string, any>(); // key: 'yyyy-MM-dd'

        // 1. Initialize map with days from all weeks
        selectedReport.weeklyData.forEach(week => {
            const start = new Date(week.weekStart);
            const end = new Date(week.weekEnd);
            let current = start;
            while (current <= end) {
                const dateKey = format(current, 'yyyy-MM-dd');
                dailyMap.set(dateKey, {
                    dateObj: current,
                    label: format(current, 'MMM d'),
                    // Initialize metrics to 0
                    'Late Check-ins': 0,
                    'Super Late': 0,
                    'Insufficient Hours': 0,
                    '<8h Office': 0
                });
                current = addDays(current, 1);
            }
        });

        // 2. Populate metrics by checking dates in the detail arrays
        selectedReport.weeklyData.forEach(week => {
            const m = week.metrics;

            // Helper to increment metric for a specific date
            const increment = (dates: { date: string }[] | undefined, metric: MetricKey) => {
                if (!dates) return;
                dates.forEach(d => {
                    const dateKey = format(parseISO(d.date), 'yyyy-MM-dd');
                    const entry = dailyMap.get(dateKey);
                    if (entry) {
                        entry[metric] = (entry[metric] || 0) + 1;
                    }
                });
            };

            increment(m.lateCheckinDates, 'Late Check-ins');
            increment(m.superLateCheckinDates, 'Super Late');
            increment(m.insufficientHoursDates, 'Insufficient Hours');
            increment(m.lessThan8hOfficeDates, '<8h Office');
        });

        return Array.from(dailyMap.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    };

    const chartData = viewMode === 'week' ? prepareComparisonData() : prepareDailyData();

    // Generate line components for selected metrics
    const generateLines = () => {
        const lines: React.ReactElement[] = [];

        Array.from(selectedMetrics).forEach((metric) => {
            const strokeColor = METRIC_COLORS[metric];
            lines.push(
                <Line
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    stroke={strokeColor}
                    strokeWidth={2}
                    strokeDasharray="0"
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                />
            );
        });

        return lines;
    };

    const selectedReport = reports.find(r => r.memberId === selectedMemberId);

    return (
        <Card ref={chartRef} className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Member Trend Analysis</CardTitle>
                <div className="flex gap-2 items-center">
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'week' | 'day')} className="nr-2">
                        <TabsList className="grid w-[180px] grid-cols-2 h-9">
                            <TabsTrigger value="week" className="text-xs px-2">
                                <CalendarRange className="w-3.5 h-3.5 mr-1.5" />
                                Week
                            </TabsTrigger>
                            <TabsTrigger value="day" className="text-xs px-2">
                                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                                Day
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="h-4 w-px bg-gray-200 mx-2" />
                    <Button variant="outline" size="sm" onClick={() => handleExport('png')}>
                        <Download className="w-4 h-4 mr-1" /> PNG
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                        <Download className="w-4 h-4 mr-1" /> PDF
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Member Selection */}
                    <div>
                        <Label className="text-sm font-medium mb-3 block">
                            Select Team Member
                        </Label>
                        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Select a member" />
                            </SelectTrigger>
                            <SelectContent>
                                {reports.map(report => (
                                    <SelectItem key={report.memberId} value={report.memberId}>
                                        {report.memberName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Metric Selection */}
                    <div>
                        <Label className="text-sm font-medium mb-3 block">
                            Select Metrics ({selectedMetrics.size} selected)
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {(Object.keys(METRIC_COLORS) as MetricKey[]).map((metric) => (
                                <div key={metric} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`metric-${metric}`}
                                        checked={selectedMetrics.has(metric)}
                                        onCheckedChange={() => toggleMetric(metric)}
                                    />
                                    <Label
                                        htmlFor={`metric-${metric}`}
                                        className="text-sm font-normal cursor-pointer flex items-center gap-2"
                                    >
                                        <div
                                            className="w-4 h-4 rounded-sm"
                                            style={{ backgroundColor: METRIC_COLORS[metric] }}
                                        />
                                        {metric}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Colors match the metrics selected above.
                        </p>
                    </div>

                    {/* Chart */}
                    <div className="border-t pt-6">
                        {selectedMemberId && selectedMetrics.size > 0 ? (
                            <ResponsiveContainer width="100%" height={450}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 11 }}
                                        stroke="#6b7280"
                                        height={60}
                                        dy={10}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        stroke="#6b7280"
                                        label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            maxHeight: '300px',
                                            overflowY: 'auto'
                                        }}
                                    />
                                    <Legend
                                        wrapperStyle={{ fontSize: '11px' }}
                                        iconType="rect"
                                    />
                                    {generateLines()}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[450px] flex items-center justify-center text-gray-500">
                                Please select a member and at least one metric
                            </div>
                        )}
                    </div>

                    {/* Summary Statistics */}
                    {selectedMemberId && selectedReport && selectedMetrics.size > 0 && (
                        <div className="border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Summary Statistics for {selectedReport.memberName}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {Array.from(selectedMetrics).map(metric => {
                                    let trendData;
                                    let metricKey: keyof ComplianceMetrics;
                                    switch (metric) {
                                        case 'Late Check-ins': trendData = selectedReport.trends.lateCheckins; metricKey = 'lateCheckins'; break;
                                        case 'Super Late': trendData = selectedReport.trends.superLateCheckins; metricKey = 'superLateCheckins'; break;
                                        case 'Insufficient Hours': trendData = selectedReport.trends.insufficientHoursBoth; metricKey = 'insufficientHoursBoth'; break;
                                        case '<8h Office': trendData = selectedReport.trends.lessThan8hOffice; metricKey = 'lessThan8hOffice'; break;
                                        default: return null;
                                    }

                                    const startValue = selectedReport.weeklyData[0]?.metrics[metricKey] as number || 0;
                                    const recentValue = selectedReport.weeklyData[selectedReport.weeklyData.length - 1]?.metrics[metricKey] as number || 0;
                                    const periodChange = recentValue - startValue;
                                    let periodDirection = 'stable';
                                    if (periodChange < 0) periodDirection = 'improving';
                                    else if (periodChange > 0) periodDirection = 'declining';

                                    return (
                                        <div key={metric} className="border rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: METRIC_COLORS[metric] }} />
                                                <span className="text-sm font-medium">{metric}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">Current:</span>
                                                    <span className="font-semibold text-gray-900">{trendData.currentWeekValue}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">Avg:</span>
                                                    <span className="font-semibold text-gray-900">{trendData.averageValue.toFixed(1)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs pt-2 border-t border-gray-100 mt-2">
                                                    <span className="text-gray-500">vs Last Week:</span>
                                                    <span className={`${trendData.direction === 'improving' ? 'text-green-600' : trendData.direction === 'declining' ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {trendData.direction === 'improving' ? '↓' : trendData.direction === 'declining' ? '↑' : '→'} {Math.abs(trendData.percentageChange).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">Period Trend:</span>
                                                    <span className={`${periodDirection === 'improving' ? 'text-green-600' : periodDirection === 'declining' ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {periodDirection === 'improving' ? 'Improving' : periodDirection === 'declining' ? 'Declining' : 'Stable'} ({startValue}→{recentValue})
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

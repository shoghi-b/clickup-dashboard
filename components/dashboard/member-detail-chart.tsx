'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import type { MemberTrendReport } from '@/lib/types/report';

interface MemberDetailChartProps {
    report: MemberTrendReport;
}

export function MemberDetailChart({ report }: MemberDetailChartProps) {
    // Prepare data for the chart
    const chartData = report.weeklyData.map((week) => ({
        week: week.weekLabel,
        'Late Check-ins': week.metrics.lateCheckins,
        'Super Late': week.metrics.superLateCheckins,
        'Insufficient Hours': week.metrics.insufficientHoursBoth,
        '<8h Office': week.metrics.lessThan8hOffice,
        'Outside Work': week.metrics.outsideOfficeWork,
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{report.memberName} - Detailed Trends</span>
                    <div className="text-sm font-normal text-gray-500">
                        {report.weeklyData.length} weeks analyzed
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Main Metrics Chart */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Key Compliance Metrics</h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="week"
                                    tick={{ fontSize: 12 }}
                                    stroke="#6b7280"
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    stroke="#6b7280"
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '12px' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Late Check-ins"
                                    stroke="#eab308"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Super Late"
                                    stroke="#dc2626"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Insufficient Hours"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="<8h Office"
                                    stroke="#d97706"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Trend Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Late Check-ins</div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">{report.trends.lateCheckins.currentWeekValue}</span>
                                <span className={`text-xs ${report.trends.lateCheckins.direction === 'improving' ? 'text-green-600' :
                                        report.trends.lateCheckins.direction === 'declining' ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                    {report.trends.lateCheckins.direction === 'improving' ? '↓' :
                                        report.trends.lateCheckins.direction === 'declining' ? '↑' : '→'}
                                    {Math.abs(report.trends.lateCheckins.percentageChange).toFixed(0)}%
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Avg: {report.trends.lateCheckins.averageValue.toFixed(1)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Super Late</div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">{report.trends.superLateCheckins.currentWeekValue}</span>
                                <span className={`text-xs ${report.trends.superLateCheckins.direction === 'improving' ? 'text-green-600' :
                                        report.trends.superLateCheckins.direction === 'declining' ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                    {report.trends.superLateCheckins.direction === 'improving' ? '↓' :
                                        report.trends.superLateCheckins.direction === 'declining' ? '↑' : '→'}
                                    {Math.abs(report.trends.superLateCheckins.percentageChange).toFixed(0)}%
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Avg: {report.trends.superLateCheckins.averageValue.toFixed(1)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Insufficient Hours</div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">{report.trends.insufficientHoursBoth.currentWeekValue}</span>
                                <span className={`text-xs ${report.trends.insufficientHoursBoth.direction === 'improving' ? 'text-green-600' :
                                        report.trends.insufficientHoursBoth.direction === 'declining' ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                    {report.trends.insufficientHoursBoth.direction === 'improving' ? '↓' :
                                        report.trends.insufficientHoursBoth.direction === 'declining' ? '↑' : '→'}
                                    {Math.abs(report.trends.insufficientHoursBoth.percentageChange).toFixed(0)}%
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Avg: {report.trends.insufficientHoursBoth.averageValue.toFixed(1)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">&lt;8h Office</div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">{report.trends.lessThan8hOffice.currentWeekValue}</span>
                                <span className={`text-xs ${report.trends.lessThan8hOffice.direction === 'improving' ? 'text-green-600' :
                                        report.trends.lessThan8hOffice.direction === 'declining' ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                    {report.trends.lessThan8hOffice.direction === 'improving' ? '↓' :
                                        report.trends.lessThan8hOffice.direction === 'declining' ? '↑' : '→'}
                                    {Math.abs(report.trends.lessThan8hOffice.percentageChange).toFixed(0)}%
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Avg: {report.trends.lessThan8hOffice.averageValue.toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

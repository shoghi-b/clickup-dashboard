'use client';

import { useMemo } from 'react';
import type { InOutPeriod } from '@/lib/types/discrepancy';
import { parseTimeToMinutes, minutesToTimeString } from '@/lib/services/discrepancy-service';

interface TimelineEntry {
    type: 'attendance' | 'log' | 'out';
    startTime: string;
    endTime?: string;
    label: string;
    color: string;
}

interface DiscrepancyTimelineProps {
    inOutPeriods: InOutPeriod[];
    clickUpLogs: Array<{
        time: string;
        taskName: string;
        duration: number; // minutes
    }>;
    workdayStart?: string;
    workdayEnd?: string;
}

export function DiscrepancyTimeline({
    inOutPeriods,
    clickUpLogs,
    workdayStart = '10:00',
    workdayEnd = '20:00'
}: DiscrepancyTimelineProps) {
    const entries = useMemo(() => {
        const result: TimelineEntry[] = [];

        // Add attendance periods
        inOutPeriods.forEach((period, idx) => {
            result.push({
                type: 'attendance',
                startTime: period.in,
                endTime: period.out,
                label: `In Office ${idx + 1}`,
                color: 'bg-green-500'
            });

            // Add OUT period (gap between this OUT and next IN)
            if (idx < inOutPeriods.length - 1) {
                result.push({
                    type: 'out',
                    startTime: period.out,
                    endTime: inOutPeriods[idx + 1].in,
                    label: `OUT ${idx + 1}`,
                    color: 'bg-gray-300'
                });
            }
        });

        // Add ClickUp logs
        clickUpLogs.forEach((log) => {
            result.push({
                type: 'log',
                startTime: log.time,
                label: `${log.taskName} (${log.duration}m)`,
                color: 'bg-blue-500'
            });
        });

        return result.sort((a, b) => {
            const aMin = parseTimeToMinutes(a.startTime) || 0;
            const bMin = parseTimeToMinutes(b.startTime) || 0;
            return aMin - bMin;
        });
    }, [inOutPeriods, clickUpLogs]);

    const workdayStartMin = parseTimeToMinutes(workdayStart) || 600; // 10:00
    const workdayEndMin = parseTimeToMinutes(workdayEnd) || 1200; // 20:00
    const totalMinutes = workdayEndMin - workdayStartMin;

    const getPosition = (time: string) => {
        const minutes = parseTimeToMinutes(time);
        if (minutes === null) return 0;
        return ((minutes - workdayStartMin) / totalMinutes) * 100;
    };

    const getWidth = (startTime: string, endTime?: string) => {
        if (!endTime) return 2; // Point in time (log)

        const start = parseTimeToMinutes(startTime);
        const end = parseTimeToMinutes(endTime);

        if (start === null || end === null) return 2;

        return ((end - start) / totalMinutes) * 100;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{workdayStart}</span>
                <span className="font-medium">Timeline</span>
                <span>{workdayEnd}</span>
            </div>

            {/* Timeline Track */}
            <div className="relative h-16 bg-gray-100 rounded-lg overflow-hidden">
                {/* Hour markers */}
                <div className="absolute inset-0 flex">
                    {Array.from({ length: 11 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 border-r border-gray-200 last:border-r-0"
                        />
                    ))}
                </div>

                {/* Attendance and OUT periods */}
                {entries
                    .filter((entry) => entry.type === 'attendance' || entry.type === 'out')
                    .map((entry, idx) => (
                        <div
                            key={`period-${idx}`}
                            className={`absolute top-2 h-6 ${entry.color} rounded opacity-70`}
                            style={{
                                left: `${getPosition(entry.startTime)}%`,
                                width: `${getWidth(entry.startTime, entry.endTime)}%`
                            }}
                            title={`${entry.label}: ${entry.startTime} - ${entry.endTime || ''}`}
                        />
                    ))}

                {/* ClickUp Logs */}
                {entries
                    .filter((entry) => entry.type === 'log')
                    .map((entry, idx) => (
                        <div
                            key={`log-${idx}`}
                            className="absolute top-0 bottom-0 w-1 bg-blue-600"
                            style={{
                                left: `${getPosition(entry.startTime)}%`
                            }}
                            title={`${entry.label} at ${entry.startTime}`}
                        >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />
                        </div>
                    ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded opacity-70" />
                    <span>In Office</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded opacity-70" />
                    <span>OUT Period</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />
                    <span>ClickUp Log</span>
                </div>
            </div>

            {/* Entry List */}
            <div className="space-y-2 mt-4">
                <div className="text-sm font-semibold text-gray-700">Event Log</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                    {entries.map((entry, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-3 text-sm py-1.5 px-2 rounded hover:bg-gray-50"
                        >
                            <span className={`w-2 h-2 rounded-full ${entry.color}`} />
                            <span className="font-mono text-xs text-gray-500 w-12">
                                {entry.startTime}
                            </span>
                            <span className="flex-1 text-gray-700">{entry.label}</span>
                            {entry.endTime && (
                                <span className="font-mono text-xs text-gray-400">
                                    → {entry.endTime}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

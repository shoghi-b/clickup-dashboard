'use client';

import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import type { DateDetail } from '@/lib/types/report';

interface MetricDetailsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    memberName: string;
    metricName: string;
    dates: DateDetail[] | string[];
}

export function MetricDetailsSheet({
    open,
    onOpenChange,
    memberName,
    metricName,
    dates,
}: MetricDetailsSheetProps) {
    const isDateDetailArray = (dates: DateDetail[] | string[]): dates is DateDetail[] => {
        return dates.length > 0 && typeof dates[0] === 'object';
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>{metricName}</SheetTitle>
                    <SheetDescription>
                        Details for {memberName}
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-3">
                    {dates.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No instances found</p>
                    ) : isDateDetailArray(dates) ? (
                        // Detailed dates with additional info
                        dates.map((detail, index) => (
                            <div
                                key={index}
                                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-900">
                                        {format(parseISO(detail.date), 'EEE, MMM dd, yyyy')}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                        {detail.value}
                                    </Badge>
                                </div>
                                {(detail.attendanceHours !== undefined || detail.clickupHours !== undefined) && (
                                    <div className="flex gap-4 text-sm text-gray-600">
                                        {detail.attendanceHours !== undefined && (
                                            <div>
                                                <span className="text-gray-500">Attendance:</span>{' '}
                                                <span className="font-medium">{detail.attendanceHours.toFixed(1)}h</span>
                                            </div>
                                        )}
                                        {detail.clickupHours !== undefined && (
                                            <div>
                                                <span className="text-gray-500">ClickUp:</span>{' '}
                                                <span className="font-medium">{detail.clickupHours.toFixed(1)}h</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        // Simple date strings (for no-data days)
                        dates.map((dateStr, index) => (
                            <div
                                key={index}
                                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <span className="font-medium text-gray-900">
                                    {format(parseISO(dateStr), 'EEE, MMM dd, yyyy')}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                        Total instances: <span className="font-medium text-gray-900">{dates.length}</span>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

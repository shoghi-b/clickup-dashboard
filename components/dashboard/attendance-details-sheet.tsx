'use client';

import { useState, useEffect } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceDetailsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    memberName: string;
    date: Date | null;
    data: AttendanceData | null;
}

interface AttendanceData {
    inOutPeriods: { in: string; out: string }[];
    unpairedIns: string[];
    unpairedOuts: string[];
    firstIn: string | null;
    lastOut: string | null;
    totalHours: number;
    status: 'PRESENT' | 'ABSENT' | 'PARTIAL';
}

export function AttendanceDetailsSheet({
    open,
    onOpenChange,
    memberName,
    date,
    data,
}: AttendanceDetailsSheetProps) {
    const [loading, setLoading] = useState(false); // Keep loading state for potential future use or initial load indicator

    // The useEffect and setAttendanceData are no longer needed as data is passed directly as a prop.
    // useEffect(() => {
    //     if (open && date) {
    //         // For now, we'll get this data from the parent component
    //         // In a full implementation, you might fetch from an API
    //         setLoading(false);
    //     }
    // }, [open, date]);

    // This will be called from parent with the data
    // const setAttendanceData = (attendanceData: AttendanceData) => {
    //     setData(attendanceData);
    // };

    const formatHours = (hours: number): string => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };

    const calculateDuration = (inTime: string, outTime: string): string => {
        const [inH, inM] = inTime.split(':').map(Number);
        const [outH, outM] = outTime.split(':').map(Number);
        const minutes = (outH * 60 + outM) - (inH * 60 + inM);
        const hours = minutes / 60;
        return formatHours(hours);
    };

    if (!date) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Attendance Details</SheetTitle>
                    <SheetDescription>
                        {memberName} • {format(date, 'MMMM d, yyyy')}
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    {!data ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center text-gray-500">
                                {open ? 'No attendance data available for this day.' : ''}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Summary Card */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <div className="text-sm text-gray-600">First Check-In</div>
                                            <div className="text-2xl font-bold text-green-600">
                                                {data.firstIn || '--:--'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600">Last Check-Out</div>
                                            <div className="text-2xl font-bold text-red-600">
                                                {data.lastOut || '--:--'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                        <div>
                                            <div className="text-sm text-gray-600">Total Hours</div>
                                            <div className="text-xl font-bold text-blue-600">
                                                {formatHours(data.totalHours)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600">Status</div>
                                            <div className={`text-xl font-bold ${data.status === 'PRESENT' ? 'text-green-600' :
                                                data.status === 'PARTIAL' ? 'text-yellow-600' :
                                                    'text-red-600'
                                                }`}>
                                                {data.status}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Valid IN-OUT Pairs */}
                            {data.inOutPeriods.length > 0 && (
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Clock className="w-5 h-5 text-blue-600" />
                                            <h3 className="font-semibold text-gray-900">Valid Work Sessions</h3>
                                            <span className="text-sm text-gray-500">({data.inOutPeriods.length} sessions)</span>
                                        </div>
                                        <div className="space-y-2">
                                            {data.inOutPeriods.map((period, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-red-50 rounded-lg border border-gray-200"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-green-600 font-bold text-lg">▶</span>
                                                            <span className="font-mono font-semibold text-green-700">{period.in}</span>
                                                        </div>
                                                        <span className="text-gray-400">→</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-red-600 font-bold text-lg">■</span>
                                                            <span className="font-mono font-semibold text-red-700">{period.out}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-medium text-blue-600">
                                                        {calculateDuration(period.in, period.out)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Unpaired Entries */}
                            {(data.unpairedIns.length > 0 || data.unpairedOuts.length > 0) && (
                                <Card className="border-yellow-200 bg-yellow-50/50">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                                            <h3 className="font-semibold text-gray-900">Unpaired Entries</h3>
                                            <span className="text-sm text-gray-500">(Missing Match)</span>
                                        </div>

                                        {data.unpairedIns.length > 0 && (
                                            <div className="mb-4">
                                                <div className="text-sm font-medium text-gray-700 mb-2">
                                                    Check-Ins without Check-Out:
                                                </div>
                                                <div className="space-y-2">
                                                    {data.unpairedIns.map((time, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center gap-2 p-2 bg-yellow-100 rounded border border-yellow-300"
                                                        >
                                                            <span className="text-green-600 font-bold text-lg">▶</span>
                                                            <span className="font-mono font-semibold text-green-700">{time}</span>
                                                            <span className="text-sm text-gray-600 ml-2">(No matching OUT)</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {data.unpairedOuts.length > 0 && (
                                            <div>
                                                <div className="text-sm font-medium text-gray-700 mb-2">
                                                    Check-Outs without Check-In:
                                                </div>
                                                <div className="space-y-2">
                                                    {data.unpairedOuts.map((time, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center gap-2 p-2 bg-yellow-100 rounded border border-yellow-300"
                                                        >
                                                            <span className="text-red-600 font-bold text-lg">■</span>
                                                            <span className="font-mono font-semibold text-red-700">{time}</span>
                                                            <span className="text-sm text-gray-600 ml-2">(No matching IN)</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* No Data Message */}
                            {data.inOutPeriods.length === 0 &&
                                data.unpairedIns.length === 0 &&
                                data.unpairedOuts.length === 0 && (
                                    <Card>
                                        <CardContent className="py-8 text-center text-gray-500">
                                            No attendance entries found for this day.
                                        </CardContent>
                                    </Card>
                                )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// Export ref type for parent component to call setAttendanceData
export type AttendanceDetailsSheetRef = {
    setAttendanceData: (data: AttendanceData) => void;
};

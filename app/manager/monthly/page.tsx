'use client';

import { useEffect } from 'react';
import { useDashboard } from '../dashboard-context';
import { MonthGridView } from '@/components/dashboard/month-grid-view';
import { DateRangePresetPicker } from '@/components/ui/date-range-preset-picker';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function MonthlySummaryPage() {
    const { dateRange, setDateRange, setViewMode, selectedMembers } = useDashboard();

    useEffect(() => {
        setViewMode('month');
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Monthly Summary</h2>
                    <p className="text-muted-foreground">Aggregated monthly attendance and logs.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePresetPicker date={dateRange} setDate={setDateRange} />
                </div>
            </div>

            {dateRange && dateRange.from && dateRange.to && (
                <MonthGridView
                    dateRange={{ from: dateRange.from, to: dateRange.to }}
                    selectedMembers={selectedMembers}
                />
            )}
        </div>
    );
}

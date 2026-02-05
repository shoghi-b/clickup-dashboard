'use client';

import React, { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ReportPeriod } from '@/lib/types/report';

interface DateRange {
    from: Date;
    to: Date;
}

interface ReportPeriodSelectorProps {
    onPeriodChange: (period: ReportPeriod, dateRange: DateRange) => void;
}

const PERIOD_OPTIONS = [
    { value: '1_DAY' as ReportPeriod, label: 'Today' },
    { value: '7_DAYS' as ReportPeriod, label: 'Last 7 Days' },
    { value: '14_DAYS' as ReportPeriod, label: 'Last 14 Days' },
    { value: '30_DAYS' as ReportPeriod, label: 'Last 30 Days' },
    { value: 'THIS_MONTH' as ReportPeriod, label: 'This Month' },
    { value: 'LAST_MONTH' as ReportPeriod, label: 'Last Month' },
    { value: 'CUSTOM' as ReportPeriod, label: 'Custom Range' },
];

export function ReportPeriodSelector({ onPeriodChange }: ReportPeriodSelectorProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('7_DAYS');
    const [customRange, setCustomRange] = useState<DateRange>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    const calculateDateRange = (period: ReportPeriod): DateRange => {
        const today = new Date();

        switch (period) {
            case '1_DAY':
                return { from: startOfDay(today), to: endOfDay(today) };

            case '7_DAYS':
                return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };

            case '14_DAYS':
                return { from: startOfDay(subDays(today, 13)), to: endOfDay(today) };

            case '30_DAYS':
                return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };

            case 'THIS_MONTH':
                return { from: startOfMonth(today), to: endOfDay(today) };

            case 'LAST_MONTH': {
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                return {
                    from: startOfMonth(lastMonth),
                    to: endOfMonth(lastMonth)
                };
            }

            case 'CUSTOM':
                return customRange;

            default:
                return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
        }
    };

    const handlePeriodChange = (period: ReportPeriod) => {
        setSelectedPeriod(period);

        if (period === 'CUSTOM') {
            setShowCustomPicker(true);
        } else {
            setShowCustomPicker(false);
            const dateRange = calculateDateRange(period);
            onPeriodChange(period, dateRange);
        }
    };

    const handleCustomRangeApply = () => {
        setShowCustomPicker(false);
        onPeriodChange('CUSTOM', customRange);
    };

    return (
        <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                    {PERIOD_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {showCustomPicker && (
                <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'justify-start text-left font-normal',
                                !customRange && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customRange?.from ? (
                                customRange.to ? (
                                    <>
                                        {format(customRange.from, 'MMM dd, yyyy')} -{' '}
                                        {format(customRange.to, 'MMM dd, yyyy')}
                                    </>
                                ) : (
                                    format(customRange.from, 'MMM dd, yyyy')
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 space-y-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">From Date</label>
                                <Calendar
                                    mode="single"
                                    selected={customRange.from}
                                    onSelect={(date) => date && setCustomRange({ ...customRange, from: date })}
                                    initialFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">To Date</label>
                                <Calendar
                                    mode="single"
                                    selected={customRange.to}
                                    onSelect={(date) => date && setCustomRange({ ...customRange, to: date })}
                                />
                            </div>
                            <Button onClick={handleCustomRangeApply} className="w-full">
                                Apply Range
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}

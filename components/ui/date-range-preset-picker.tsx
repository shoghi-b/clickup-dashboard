
'use client';

import * as React from 'react';
import { addDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears, format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface DateRangePresetPickerProps {
    className?: string;
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    align?: 'start' | 'center' | 'end';
}

export function DateRangePresetPicker({
    className,
    date,
    setDate,
    align = 'start',
}: DateRangePresetPickerProps) {
    const [selectedPreset, setSelectedPreset] = React.useState<string>('custom');

    const presets = [
        { label: 'Today', getValue: () => ({ from: new Date(), to: new Date() }) },
        { label: 'Yesterday', getValue: () => ({ from: addDays(new Date(), -1), to: addDays(new Date(), -1) }) },
        { label: 'This Week (Mon-Today)', getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
        { label: 'Last Week (Mon-Sat)', getValue: () => ({ from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), to: addDays(endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), -1) }) },
        // Note: User asked for (Mon-Sat) for Last Week, but usually it's Mon-Sun. Using Mon-Sat as requested.
        { label: 'This Month', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
        { label: 'Last Month', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
        { label: 'Last 90 Days', getValue: () => ({ from: addDays(new Date(), -90), to: new Date() }) },
        { label: 'This Quarter', getValue: () => ({ from: startOfQuarter(new Date()), to: new Date() }) },
        { label: 'Last Quarter', getValue: () => ({ from: startOfQuarter(subQuarters(new Date(), 1)), to: endOfQuarter(subQuarters(new Date(), 1)) }) },
        { label: 'This Year', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
        { label: 'Last Calendar Year', getValue: () => ({ from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) }) },
    ];

    const handlePresetChange = (value: string) => {
        setSelectedPreset(value);
        const preset = presets.find((p) => p.label === value);
        if (preset) {
            setDate(preset.getValue());
        }
    };

    return (
        <div className={cn('grid gap-2', className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={'outline'}
                        className={cn(
                            'w-[300px] justify-start text-left font-normal',
                            !date && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, 'LLL dd, y')} -{' '}
                                    {format(date.to, 'LLL dd, y')}
                                </>
                            ) : (
                                format(date.from, 'LLL dd, y')
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align={align}>
                    <div className="flex flex-col gap-2 p-2 border-b">
                        <Select value={selectedPreset} onValueChange={handlePresetChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a preset period" />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                <SelectItem value="custom">Custom Range</SelectItem>
                                {presets.map((preset) => (
                                    <SelectItem key={preset.label} value={preset.label}>
                                        {preset.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="p-0">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={(newDate) => {
                                setDate(newDate);
                                setSelectedPreset('custom');
                            }}
                            numberOfMonths={2}
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

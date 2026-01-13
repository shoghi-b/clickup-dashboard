'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  mode?: 'week' | 'month';
}

export function DateRangePicker({ value, onChange, mode = 'week' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePrevious = () => {
    if (mode === 'week') {
      const previousWeek = subWeeks(value.from, 1);
      onChange({
        from: startOfWeek(previousWeek, { weekStartsOn: 1 }),
        to: endOfWeek(previousWeek, { weekStartsOn: 1 }),
      });
    } else {
      const previousMonth = subMonths(value.from, 1);
      onChange({
        from: startOfMonth(previousMonth),
        to: endOfMonth(previousMonth),
      });
    }
  };

  const handleNext = () => {
    if (mode === 'week') {
      const nextWeek = addWeeks(value.from, 1);
      onChange({
        from: startOfWeek(nextWeek, { weekStartsOn: 1 }),
        to: endOfWeek(nextWeek, { weekStartsOn: 1 }),
      });
    } else {
      const nextMonth = addMonths(value.from, 1);
      onChange({
        from: startOfMonth(nextMonth),
        to: endOfMonth(nextMonth),
      });
    }
  };

  const handleThisPeriod = () => {
    if (mode === 'week') {
      onChange({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      });
    } else {
      onChange({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      });
    }
  };

  const handleCustomDateChange = (dateString: string) => {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      if (mode === 'week') {
        // When user selects any date, select the entire week
        onChange({
          from: startOfWeek(date, { weekStartsOn: 1 }),
          to: endOfWeek(date, { weekStartsOn: 1 }),
        });
      } else {
        // When user selects any date, select the entire month
        onChange({
          from: startOfMonth(date),
          to: endOfMonth(date),
        });
      }
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    if (mode === 'week') {
      return `${format(value.from, 'MMM dd')} - ${format(value.to, 'MMM dd, yyyy')}`;
    } else {
      return format(value.from, 'MMMM yyyy');
    }
  };

  const getPickerTitle = () => {
    return mode === 'week' ? 'Select Week' : 'Select Month';
  };

  const getPickerDescription = () => {
    return mode === 'week'
      ? 'Pick any date to select that week'
      : 'Pick any date to select that month';
  };

  const getThisButtonText = () => {
    return mode === 'week' ? 'Go to This Week' : 'Go to This Month';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Previous Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        className="h-10 w-10"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Date Picker */}
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="min-w-[280px] justify-start text-left font-normal"
        >
          <Calendar className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-50 mt-2 w-80 rounded-md border bg-white p-4 shadow-lg">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">{getPickerTitle()}</h3>
                  <p className="text-xs text-gray-500 mb-3">{getPickerDescription()}</p>
                  <div>
                    <Input
                      type="date"
                      value={format(value.from, 'yyyy-MM-dd')}
                      onChange={(e) => handleCustomDateChange(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Selected: {getDisplayText()}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <Button
                    onClick={handleThisPeriod}
                    variant="outline"
                    className="w-full"
                  >
                    {getThisButtonText()}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        className="h-10 w-10"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}


'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface DateRange {
  from: Date;
  to: Date;
}

interface CustomDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function CustomDateRangePicker({ value, onChange }: CustomDateRangePickerProps) {
  const handleStartDateChange = (dateString: string) => {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      onChange({
        from: date,
        to: value.to
      });
    }
  };

  const handleEndDateChange = (dateString: string) => {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      onChange({
        from: value.from,
        to: date
      });
    }
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="start-date" className="text-sm font-medium text-gray-700">
          Start Date
        </Label>
        <Input
          id="start-date"
          type="date"
          value={formatDateForInput(value.from)}
          onChange={(e) => handleStartDateChange(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end-date" className="text-sm font-medium text-gray-700">
          End Date
        </Label>
        <Input
          id="end-date"
          type="date"
          value={formatDateForInput(value.to)}
          onChange={(e) => handleEndDateChange(e.target.value)}
          className="w-full"
        />
      </div>
    </div>
  );
}


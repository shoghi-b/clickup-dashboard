'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectBreakdownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMemberId: string | null;
  memberName: string;
  date?: Date | null; // For single day
  startDate?: Date | null; // For date range
  endDate?: Date | null; // For date range
}

interface TimeEntry {
  id: string;
  taskName: string | null;
  duration: number;
  hours: number;
  startDate: string;
  endDate: string | null;
}

interface List {
  listId: string | null;
  listName: string;
  totalHours: number;
  entryCount: number;
  entries: TimeEntry[];
}

interface Space {
  spaceId: string | null;
  spaceName: string;
  totalHours: number;
  lists: List[];
}

interface ProjectBreakdownData {
  totalHours: number;
  totalEntries: number;
  spaces: Space[];
}

export function ProjectBreakdownSheet({
  open,
  onOpenChange,
  teamMemberId,
  memberName,
  date,
  startDate,
  endDate,
}: ProjectBreakdownSheetProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProjectBreakdownData | null>(null);

  useEffect(() => {
    if (open && teamMemberId) {
      fetchProjectBreakdown();
    }
  }, [open, teamMemberId, date, startDate, endDate]);

  const fetchProjectBreakdown = async () => {
    if (!teamMemberId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ teamMemberId });
      
      if (date) {
        params.append('date', date.toISOString());
      } else if (startDate && endDate) {
        params.append('startDate', startDate.toISOString());
        params.append('endDate', endDate.toISOString());
      }

      const response = await fetch(`/api/time-entries/project-breakdown?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch project breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getDateRangeText = () => {
    if (date) {
      return format(date, 'MMMM d, yyyy');
    } else if (startDate && endDate) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    return '';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Project-wise Time Utilization</SheetTitle>
          <SheetDescription>
            {memberName} • {getDateRangeText()}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : data ? (
            <>
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Hours</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatHours(data.totalHours)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Entries</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {data.totalEntries}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Spaces and Lists */}
              {data.spaces.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No time entries found for this period.
                  </CardContent>
                </Card>
              ) : (
                data.spaces.map((space) => (
                  <Card key={space.spaceId || 'no-space'}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{space.spaceName}</CardTitle>
                        <div className="text-sm font-semibold text-blue-600">
                          {formatHours(space.totalHours)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {space.lists.map((list) => (
                        <div
                          key={list.listId || 'no-list'}
                          className="border-l-4 border-blue-200 pl-4 py-2"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium text-gray-900">{list.listName}</div>
                              <div className="text-xs text-gray-500">
                                {list.entryCount} {list.entryCount === 1 ? 'entry' : 'entries'}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-gray-700">
                              {formatHours(list.totalHours)}
                            </div>
                          </div>

                          {/* Task entries */}
                          <div className="space-y-1 mt-2">
                            {list.entries.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5"
                              >
                                <div className="flex-1 truncate text-gray-700">
                                  {entry.taskName || 'Untitled Task'}
                                </div>
                                <div className="text-gray-600 ml-2">
                                  {formatHours(entry.hours)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No data available.
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}


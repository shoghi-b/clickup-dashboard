'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

interface DailySummary {
  id: string;
  date: string;
  totalHours: number;
  teamMemberId: string;
  teamMember: {
    id: string;
    username: string;
    email: string | null;
    profilePicture: string | null;
  };
}

interface TeamMember {
  id: string;
  username: string;
  email: string | null;
  profilePicture: string | null;
  clickupId: number;
}

interface TimesheetGridViewProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

interface TeamMemberRow {
  member: TeamMember;
  dailyHours: Map<string, number>;
  weekTotal: number;
}

export function TimesheetGridView({ dateRange }: TimesheetGridViewProps) {
  const [teamData, setTeamData] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  useEffect(() => {
    // Calculate the week days to display (Monday to Sunday)
    const start = startOfWeek(dateRange.from, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(dateRange.from, { weekStartsOn: 1 }); // Sunday
    const days = eachDayOfInterval({ start, end }); // All 7 days
    setWeekDays(days);

    fetchTimesheetData();
  }, [dateRange]);

  const fetchTimesheetData = async () => {
    setLoading(true);
    try {
      // Fetch team members
      const membersResponse = await fetch('/api/team-members');
      const membersResult = await membersResponse.json();

      // Fetch daily summaries
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      const summariesResponse = await fetch(`/api/analytics/daily?${params}`);
      const summariesResult = await summariesResponse.json();

      if (membersResult.success && summariesResult.success) {
        const members: TeamMember[] = membersResult.data;
        const summaries: DailySummary[] = summariesResult.data;

        // Build the grid data
        const gridData: TeamMemberRow[] = members.map(member => {
          const dailyHours = new Map<string, number>();
          let weekTotal = 0;

          summaries
            .filter(s => s.teamMemberId === member.id)
            .forEach(summary => {
              const dateKey = format(new Date(summary.date), 'yyyy-MM-dd');
              dailyHours.set(dateKey, summary.totalHours);
              weekTotal += summary.totalHours;
            });

          return {
            member,
            dailyHours,
            weekTotal,
          };
        });

        setTeamData(gridData);
      }
    } catch (error) {
      console.error('Failed to fetch timesheet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHoursForDay = (row: TeamMemberRow, day: Date): number => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return row.dailyHours.get(dateKey) || 0;
  };

  const formatHours = (hours: number): string => {
    if (hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getCellColor = (hours: number): string => {
    if (hours === 0) return 'bg-gray-50 text-gray-400';
    if (hours < 6) return 'bg-blue-50 text-blue-700';
    if (hours >= 6 && hours <= 9) return 'bg-blue-100 text-blue-800';
    return 'bg-red-50 text-red-700'; // Over 9 hours
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (teamData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Timesheet Grid</CardTitle>
          <CardDescription>No data available. Click "Sync Data" to fetch timesheet data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Timesheet Grid</CardTitle>
        <CardDescription>
          {format(weekDays[0], 'MMM d')} - {format(weekDays[weekDays.length - 1], 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium text-gray-700 sticky left-0 bg-white z-10">
                  People ({teamData.length})
                </th>
                {weekDays.map(day => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6; // Sunday or Saturday
                  return (
                    <th
                      key={day.toISOString()}
                      className={`text-center p-3 font-medium min-w-[100px] ${
                        isWeekend ? 'bg-gray-50 text-gray-600' : 'text-gray-700'
                      }`}
                    >
                      <div>{format(day, 'EEE, MMM d')}</div>
                    </th>
                  );
                })}
                <th className="text-center p-3 font-medium text-gray-700 min-w-[100px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {teamData.map(row => (
                <tr key={row.member.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                      {row.member.profilePicture ? (
                        <img
                          src={row.member.profilePicture}
                          alt={row.member.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                          {row.member.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{row.member.username}</div>
                        <div className="text-xs text-gray-500">40h</div>
                      </div>
                    </div>
                  </td>
                  {weekDays.map(day => {
                    const hours = getHoursForDay(row, day);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <td
                        key={day.toISOString()}
                        className={`p-2 text-center ${isWeekend ? 'bg-gray-50' : ''}`}
                      >
                        <div className={`rounded px-3 py-2 text-sm font-medium ${getCellColor(hours)}`}>
                          {formatHours(hours)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">
                    <div className="rounded px-3 py-2 text-sm font-medium bg-gray-100 text-gray-900">
                      {formatHours(row.weekTotal)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


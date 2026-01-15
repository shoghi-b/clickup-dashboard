'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';

interface WeeklySummary {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
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

interface MonthGridViewProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  selectedMembers: string[];
}

interface TeamMemberRow {
  member: TeamMember;
  weeklyHours: Map<string, number>;
  monthTotal: number;
}

interface WeekInfo {
  weekStart: Date;
  weekEnd: Date;
  weekKey: string;
}

export function MonthGridView({ dateRange, selectedMembers }: MonthGridViewProps) {
  const [teamData, setTeamData] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);

  useEffect(() => {
    // Calculate the weeks in the month
    const monthStart = startOfMonth(dateRange.from);
    const monthEnd = endOfMonth(dateRange.from);
    
    const weekStarts = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 } // Monday
    );

    const weekInfos: WeekInfo[] = weekStarts.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      return { weekStart, weekEnd, weekKey };
    });

    setWeeks(weekInfos);
    fetchMonthData();
  }, [dateRange, selectedMembers]);

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      // Fetch team members
      const membersResponse = await fetch('/api/team-members');
      const membersResult = await membersResponse.json();

      // Fetch weekly summaries for the month
      const monthStart = startOfMonth(dateRange.from);
      const monthEnd = endOfMonth(dateRange.from);
      
      const params = new URLSearchParams({
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
      });
      const summariesResponse = await fetch(`/api/analytics/weekly?${params}`);
      const summariesResult = await summariesResponse.json();

      if (membersResult.success && summariesResult.success) {
        const members: TeamMember[] = membersResult.data;
        const summaries: WeeklySummary[] = summariesResult.data;

        // Filter members based on selection
        const filteredMembers = members.filter(member =>
          selectedMembers.includes(member.id)
        );

        // Build the grid data
        const gridData: TeamMemberRow[] = filteredMembers.map(member => {
          const weeklyHours = new Map<string, number>();
          let monthTotal = 0;

          summaries
            .filter(s => s.teamMemberId === member.id)
            .forEach(summary => {
              const weekKey = format(new Date(summary.weekStartDate), 'yyyy-MM-dd');
              weeklyHours.set(weekKey, summary.totalHours);
              monthTotal += summary.totalHours;
            });

          return {
            member,
            weeklyHours,
            monthTotal,
          };
        });

        setTeamData(gridData);
      }
    } catch (error) {
      console.error('Failed to fetch month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHoursForWeek = (row: TeamMemberRow, weekKey: string): number => {
    return row.weeklyHours.get(weekKey) || 0;
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
    if (hours < 30) return 'bg-blue-50 text-blue-700';
    if (hours >= 30 && hours <= 45) return 'bg-blue-100 text-blue-800';
    return 'bg-red-50 text-red-700'; // Over 45 hours
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
          <CardTitle>Monthly Timesheet Grid</CardTitle>
          <CardDescription>No data available. Click "Sync Data" to fetch timesheet data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Timesheet Grid</CardTitle>
        <CardDescription>
          {format(dateRange.from, 'MMMM yyyy')}
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
                {weeks.map((week, index) => (
                  <th key={week.weekKey} className="text-center p-3 font-medium text-gray-700 min-w-[120px]">
                    <div className="text-sm">Week {index + 1}</div>
                    <div className="text-xs text-gray-500 font-normal">
                      {format(week.weekStart, 'MMM d')} - {format(week.weekEnd, 'MMM d')}
                    </div>
                  </th>
                ))}
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
                        <div className="text-xs text-gray-500">160h</div>
                      </div>
                    </div>
                  </td>
                  {weeks.map(week => {
                    const hours = getHoursForWeek(row, week.weekKey);
                    return (
                      <td key={week.weekKey} className="p-2 text-center">
                        <div className={`rounded px-3 py-2 text-sm font-medium ${getCellColor(hours)}`}>
                          {formatHours(hours)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">
                    <div className="rounded px-3 py-2 text-sm font-medium bg-gray-100 text-gray-900">
                      {formatHours(row.monthTotal)}
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


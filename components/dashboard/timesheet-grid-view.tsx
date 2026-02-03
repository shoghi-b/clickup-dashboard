'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ProjectBreakdownSheet } from './project-breakdown-sheet';
import { AttendanceDetailsSheet } from './attendance-details-sheet';

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

interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeCode: string | null;
  date: string;
  inOutPeriods: string; // JSON string of { in: string; out: string }[]
  unpairedIns: string; // JSON string of string[]
  unpairedOuts: string; // JSON string of string[]
  firstIn: string | null;
  lastOut: string | null;
  totalHours: number;
  status: 'PRESENT' | 'ABSENT' | 'PARTIAL';
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
  selectedMembers: string[];
}

interface DayData {
  clickupHours: number;
  attendanceHours: number;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'PARTIAL' | null;
  inOutPeriods: { in: string; out: string }[];
  unpairedIns: string[];
  unpairedOuts: string[];
  firstIn: string | null;
  lastOut: string | null;
}

interface TeamMemberRow {
  member: TeamMember;
  dailyData: Map<string, DayData>;
  weekTotalClickup: number;
  weekTotalAttendance: number;
}

export function TimesheetGridView({ dateRange, selectedMembers }: TimesheetGridViewProps) {
  const [teamData, setTeamData] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [projectBreakdownOpen, setProjectBreakdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [attendanceDetailsOpen, setAttendanceDetailsOpen] = useState(false);
  const [selectedAttendanceMember, setSelectedAttendanceMember] = useState<string>('');
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<Date | null>(null);
  const [selectedAttendanceData, setSelectedAttendanceData] = useState<DayData | null>(null);

  useEffect(() => {
    // Calculate the week days to display (Monday to Sunday)
    const start = startOfWeek(dateRange.from, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(dateRange.from, { weekStartsOn: 1 }); // Sunday
    const days = eachDayOfInterval({ start, end }); // All 7 days
    setWeekDays(days);

    fetchTimesheetData();
  }, [dateRange, selectedMembers]);

  const fetchTimesheetData = async () => {
    setLoading(true);
    try {
      // Get the week start and end dates
      const weekStart = startOfWeek(dateRange.from, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(dateRange.from, { weekStartsOn: 1 });

      // Fetch team members
      const membersResponse = await fetch('/api/team-members');
      const membersResult = await membersResponse.json();

      // Fetch daily summaries (ClickUp data) - use full week range
      const params = new URLSearchParams({
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
      });
      const summariesResponse = await fetch(`/api/analytics/daily?${params}`);
      const summariesResult = await summariesResponse.json();

      // Fetch attendance records - use full week range
      const attendanceResponse = await fetch(`/api/attendance/records?${params}`);
      const attendanceResult = await attendanceResponse.json();

      console.log('Attendance API Response:', attendanceResult);

      if (membersResult.success && summariesResult.success) {
        const members: TeamMember[] = membersResult.data;
        const summaries: DailySummary[] = summariesResult.data;
        const attendanceRecords: AttendanceRecord[] = attendanceResult.success ? attendanceResult.records : [];

        console.log('Attendance records count:', attendanceRecords.length);
        if (attendanceRecords.length > 0) {
          console.log('Sample attendance record:', attendanceRecords[0]);
        }

        // Filter members based on selection
        const filteredMembers = members.filter(member =>
          selectedMembers.includes(member.id)
        );

        // Build the grid data
        const gridData: TeamMemberRow[] = filteredMembers.map(member => {
          const dailyData = new Map<string, DayData>();
          let weekTotalClickup = 0;
          let weekTotalAttendance = 0;

          // Add ClickUp data
          summaries
            .filter(s => s.teamMemberId === member.id)
            .forEach(summary => {
              const dateKey = format(new Date(summary.date), 'yyyy-MM-dd');
              const existing = dailyData.get(dateKey) || {
                clickupHours: 0,
                attendanceHours: 0,
                attendanceStatus: null,
                inOutPeriods: [],
                unpairedIns: [],
                unpairedOuts: [],
                firstIn: null,
                lastOut: null,
              };
              existing.clickupHours = summary.totalHours;
              dailyData.set(dateKey, existing);
              weekTotalClickup += summary.totalHours;
            });

          // Add Attendance data (match by username - flexible matching)
          const matchedRecords = attendanceRecords.filter(record => {
            const attendanceName = record.employeeName.toLowerCase().trim();
            const memberName = member.username.toLowerCase().trim();
            // Check if attendance name is contained in member name or vice versa
            return memberName.includes(attendanceName) || attendanceName.includes(memberName);
          });

          if (matchedRecords.length > 0) {
            console.log(`Matched ${matchedRecords.length} attendance records for ${member.username}`);
          }

          matchedRecords.forEach(record => {
            const recordDate = new Date(record.date);
            const dateKey = format(recordDate, 'yyyy-MM-dd');

            // Only process records within the current week
            if (recordDate >= weekStart && recordDate <= weekEnd) {
              const existing = dailyData.get(dateKey) || {
                clickupHours: 0,
                attendanceHours: 0,
                attendanceStatus: null,
                inOutPeriods: [],
                unpairedIns: [],
                unpairedOuts: [],
                firstIn: null,
                lastOut: null,
              };
              existing.attendanceHours = record.totalHours;
              existing.attendanceStatus = record.status;
              existing.firstIn = record.firstIn;
              existing.lastOut = record.lastOut;
              // Parse inOutPeriods from JSON string
              try {
                existing.inOutPeriods = JSON.parse((record as any).inOutPeriods || '[]');
              } catch (e) {
                existing.inOutPeriods = [];
              }
              // Parse unpairedIns from JSON string
              try {
                existing.unpairedIns = JSON.parse((record as any).unpairedIns || '[]');
              } catch (e) {
                existing.unpairedIns = [];
              }
              // Parse unpairedOuts from JSON string
              try {
                existing.unpairedOuts = JSON.parse((record as any).unpairedOuts || '[]');
              } catch (e) {
                existing.unpairedOuts = [];
              }
              dailyData.set(dateKey, existing);

              // Only add to weekly total if it's within the current week
              weekTotalAttendance += record.totalHours;
            }
          });

          return {
            member,
            dailyData,
            weekTotalClickup,
            weekTotalAttendance,
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

  const getDataForDay = (row: TeamMemberRow, day: Date): DayData => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return row.dailyData.get(dateKey) || {
      clickupHours: 0,
      attendanceHours: 0,
      attendanceStatus: null,
      inOutPeriods: [],
      unpairedIns: [],
      unpairedOuts: [],
      firstIn: null,
      lastOut: null,
    };
  };

  const formatHours = (hours: number): string => {
    if (hours === 0) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getClickupCellColor = (hours: number): string => {
    if (hours === 0) return 'bg-gray-50 text-gray-400';
    if (hours < 6) return 'bg-blue-50 text-blue-700';
    if (hours >= 6 && hours <= 9) return 'bg-blue-100 text-blue-800';
    return 'bg-red-50 text-red-700'; // Over 9 hours
  };

  const getAttendanceCellColor = (status: 'PRESENT' | 'ABSENT' | 'PARTIAL' | null): string => {
    if (!status) return 'bg-gray-50 text-gray-400';
    if (status === 'PRESENT') return 'bg-green-100 text-green-800 border border-green-300';
    if (status === 'PARTIAL') return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    return 'bg-red-100 text-red-800 border border-red-300'; // ABSENT
  };

  const handleDayClick = (member: TeamMember, day: Date, hours: number) => {
    if (hours === 0) return; // Don't open for zero hours
    setSelectedMember({ id: member.id, name: member.username });
    setSelectedDate(day);
    setSelectedDateRange(null);
    setProjectBreakdownOpen(true);
  };

  const handleWeekTotalClick = (member: TeamMember, totalHours: number) => {
    if (totalHours === 0) return; // Don't open for zero hours
    const weekStart = startOfWeek(dateRange.from, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(dateRange.from, { weekStartsOn: 1 });
    setSelectedMember({ id: member.id, name: member.username });
    setSelectedDate(null);
    setSelectedDateRange({ start: weekStart, end: weekEnd });
    setProjectBreakdownOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Timesheet & Attendance Grid</CardTitle>
          <CardDescription>Loading timesheet data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left p-3 font-medium text-gray-700 sticky left-0 bg-white z-10 border-r">
                    People
                  </th>
                  {[...Array(7)].map((_, i) => (
                    <th key={i} colSpan={2} className="text-center p-2 font-medium border-r text-gray-700">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mx-auto"></div>
                    </th>
                  ))}
                  <th colSpan={2} className="text-center p-2 font-medium text-gray-700">Total</th>
                </tr>
                <tr className="border-b bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 z-10 border-r"></th>
                  {[...Array(7)].map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="text-center p-2 text-xs font-medium text-gray-600 min-w-[80px]">
                        ClickUp
                      </th>
                      <th className="text-center p-2 text-xs font-medium text-gray-600 min-w-[80px] border-r">
                        Attendance
                      </th>
                    </React.Fragment>
                  ))}
                  <th className="text-center p-2 text-xs font-medium text-gray-600 min-w-[80px]">
                    ClickUp
                  </th>
                  <th className="text-center p-2 text-xs font-medium text-gray-600 min-w-[80px]">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b">
                    <td className="p-3 sticky left-0 bg-white z-10 border-r">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-1"></div>
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-12"></div>
                        </div>
                      </div>
                    </td>
                    {[...Array(7)].map((_, dayIndex) => (
                      <React.Fragment key={dayIndex}>
                        <td className="p-1 text-center">
                          <div className="h-7 bg-gray-100 rounded animate-pulse mx-auto w-12"></div>
                        </td>
                        <td className="p-1 text-center border-r">
                          <div className="h-7 bg-gray-100 rounded animate-pulse mx-auto w-12"></div>
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="p-1 text-center">
                      <div className="h-7 bg-gray-100 rounded animate-pulse mx-auto w-12"></div>
                    </td>
                    <td className="p-1 text-center">
                      <div className="h-7 bg-gray-100 rounded animate-pulse mx-auto w-12"></div>
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Timesheet & Attendance Grid</CardTitle>
          <CardDescription>
            {format(weekDays[0], 'MMM d')} - {format(weekDays[weekDays.length - 1], 'MMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left p-3 font-medium text-gray-700 sticky left-0 bg-white z-10 border-r">
                    People ({teamData.length})
                  </th>
                  {weekDays.map(day => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <th
                        key={day.toISOString()}
                        colSpan={2}
                        className={`text-center p-2 font-medium border-r ${isWeekend ? 'bg-gray-50 text-gray-600' : 'text-gray-700'
                          }`}
                      >
                        <div className="text-sm">{format(day, 'EEE, MMM d')}</div>
                      </th>
                    );
                  })}
                  <th colSpan={2} className="text-center p-2 font-medium text-gray-700">Total</th>
                </tr>
                <tr className="border-b bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 z-10 border-r"></th>
                  {weekDays.map(day => (
                    <React.Fragment key={`sub-${day.toISOString()}`}>
                      <th className="text-center p-2 text-xs font-medium text-gray-600 min-w-[80px]">
                        ClickUp
                      </th>
                      <th className="text-center p-2 text-xs font-medium text-gray-600 min-w-[80px] border-r">
                        Attendance
                      </th>
                    </React.Fragment>
                  ))}
                  <th className="text-center p-2 text-xs font-medium text-gray-600 min-w-[80px]">
                    ClickUp
                  </th>
                  <th className="text-center p-2 text-xs font-medium text-gray-600 min-w-[80px]">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamData.map(row => (
                  <tr key={row.member.id} className="border-b hover:bg-gray-50/50">
                    <td className="p-3 sticky left-0 bg-white z-10 border-r">
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
                      const dayData = getDataForDay(row, day);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <React.Fragment key={`data-${day.toISOString()}`}>
                          {/* ClickUp Column */}
                          <td className={`p-1 text-center ${isWeekend ? 'bg-gray-50' : ''}`}>
                            <div
                              className={`rounded px-2 py-1.5 text-xs font-medium ${getClickupCellColor(dayData.clickupHours)} ${dayData.clickupHours > 0 ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all' : ''}`}
                              onClick={() => handleDayClick(row.member, day, dayData.clickupHours)}
                            >
                              {formatHours(dayData.clickupHours)}
                            </div>
                          </td>
                          {/* Attendance Column */}
                          <td className={`p-1 text-center border-r ${isWeekend ? 'bg-gray-50' : ''}`}>
                            {dayData.attendanceStatus ? (
                              <div
                                className={`rounded px-2 py-1.5 text-xs font-medium cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${getAttendanceCellColor(dayData.attendanceStatus)}`}
                                onClick={() => {
                                  setSelectedAttendanceMember(row.member.username);
                                  setSelectedAttendanceDate(day);
                                  setSelectedAttendanceData(dayData);
                                  setAttendanceDetailsOpen(true);
                                }}
                              >
                                {dayData.attendanceHours > 0
                                  ? formatHours(dayData.attendanceHours)
                                  : dayData.firstIn
                                    ? `In ${dayData.firstIn}`
                                    : '-'}
                              </div>
                            ) : (
                              <div className="rounded px-2 py-1.5 text-xs font-medium bg-gray-50 text-gray-400">
                                -
                              </div>
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    {/* Total Columns */}
                    <td className="p-1 text-center">
                      <div
                        className={`rounded px-2 py-1.5 text-xs font-medium bg-blue-100 text-blue-900 ${row.weekTotalClickup > 0 ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all' : ''}`}
                        onClick={() => handleWeekTotalClick(row.member, row.weekTotalClickup)}
                      >
                        {formatHours(row.weekTotalClickup)}
                      </div>
                    </td>
                    <td className="p-1 text-center">
                      <div className="rounded px-2 py-1.5 text-xs font-medium bg-gray-100 text-gray-900">
                        {formatHours(row.weekTotalAttendance)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Project Breakdown Sheet */}
      <ProjectBreakdownSheet
        open={projectBreakdownOpen}
        onOpenChange={setProjectBreakdownOpen}
        teamMemberId={selectedMember?.id || null}
        memberName={selectedMember?.name || ''}
        date={selectedDate}
        startDate={selectedDateRange?.start || null}
        endDate={selectedDateRange?.end || null}
      />

      {/* Attendance Details Sheet */}
      <AttendanceDetailsSheet
        open={attendanceDetailsOpen}
        onOpenChange={setAttendanceDetailsOpen}
        memberName={selectedAttendanceMember}
        date={selectedAttendanceDate}
        data={selectedAttendanceData ? {
          inOutPeriods: selectedAttendanceData.inOutPeriods,
          unpairedIns: selectedAttendanceData.unpairedIns,
          unpairedOuts: selectedAttendanceData.unpairedOuts,
          firstIn: selectedAttendanceData.firstIn,
          lastOut: selectedAttendanceData.lastOut,
          totalHours: selectedAttendanceData.attendanceHours,
          status: selectedAttendanceData.attendanceStatus || 'ABSENT',
        } : null}
      />
    </>
  );
}

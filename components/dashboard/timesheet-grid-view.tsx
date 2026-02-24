'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { DayCellModal } from './day-cell-modal';

// ─── Data interfaces ──────────────────────────────────────────────────────────

interface DailySummary {
  id: string;
  date: string;
  totalHours: number;
  teamMemberId: string;
  teamMember: { id: string; username: string; email: string | null; profilePicture: string | null };
}

interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeCode: string | null;
  date: string;
  inOutPeriods: string;
  unpairedIns: string;
  unpairedOuts: string;
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

interface TimesheetGridViewProps {
  dateRange: { from: Date; to: Date };
  selectedMembers: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_HOURS = 8; // progress bar scale

function fmtHours(hours: number): string {
  if (hours === 0) return '–';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function fmtDelta(delta: number): string {
  if (Math.abs(delta) < 0.017) return '–'; // < 1 min
  const sign = delta > 0 ? '+' : '−';
  const abs = Math.abs(delta);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

function deltaColour(delta: number): string {
  if (delta >= -0.5) return 'text-emerald-600';
  if (delta >= -2) return 'text-amber-500';
  return 'text-red-500';
}

function utilizationColour(pct: number): string {
  if (pct >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (pct >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function gapColour(gap: number): string {
  if (gap >= 0) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (gap >= -2) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

// ─── Sub-component: a single merged day cell ─────────────────────────────────

interface DayCellProps {
  dayData: DayData;
  isWeekend: boolean;
  isPresent: boolean;
  onClick: () => void;
}

function DayCell({ dayData, isWeekend, isPresent, onClick }: DayCellProps) {
  const cu = dayData.clickupHours;
  const att = dayData.attendanceHours;
  const delta = cu - att;

  const cuFill = Math.min(100, (cu / MAX_HOURS) * 100);
  const attFill = Math.min(100, (att / MAX_HOURS) * 100);

  const hasData = cu > 0 || att > 0 || isPresent;

  return (
    <td
      className={`py-2.5 px-2 border-r last:border-r-0 align-top transition-colors ${isWeekend ? 'bg-gray-50/60' : ''
        } hover:bg-[#f0f4ff] cursor-pointer`}
      style={{ minWidth: 130 }}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1.5 pointer-events-none">
        {/* ── ClickUp bar row ── */}
        <div className="flex items-center gap-2">
          <div className="h-[7px] flex-1 rounded-full bg-indigo-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
              style={{ width: `${cuFill}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-indigo-500 w-11 text-right shrink-0 tabular-nums">
            {cu > 0 ? fmtHours(cu) : '0m'}
          </span>
        </div>

        {/* ── Attendance bar row ── */}
        <div className="flex items-center gap-2">
          <div className="h-[7px] flex-1 rounded-full bg-sky-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all"
              style={{ width: `${attFill}%` }}
            />
          </div>
          <span
            className={`text-[10px] font-semibold w-11 text-right shrink-0 tabular-nums ${att > 0 ? 'text-sky-600' : isPresent ? 'text-amber-400' : 'text-gray-300'
              }`}
          >
            {att > 0 ? fmtHours(att) : isPresent ? '0m' : '–'}
          </span>
        </div>

        {/* ── Delta ── */}
        {hasData && (
          <div className={`text-[10px] font-semibold leading-none mt-0.5 ${deltaColour(delta)}`}>
            {fmtDelta(delta)}
          </div>
        )}
      </div>
    </td>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TimesheetGridView({ dateRange, selectedMembers }: TimesheetGridViewProps) {
  const [teamData, setTeamData] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  const [dayCellModalOpen, setDayCellModalOpen] = useState(false);
  const [selectedDayMember, setSelectedDayMember] = useState<{ id: string; name: string } | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);

  useEffect(() => {
    const start = startOfWeek(dateRange.from, { weekStartsOn: 1 });
    const end = endOfWeek(dateRange.from, { weekStartsOn: 1 });
    setWeekDays(eachDayOfInterval({ start, end }));
    fetchTimesheetData();
  }, [dateRange, selectedMembers]);

  // ── Data fetching (unchanged logic) ──────────────────────────────────────

  const fetchTimesheetData = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(dateRange.from, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(dateRange.from, { weekStartsOn: 1 });
      const params = new URLSearchParams({
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
      });

      const [membersRes, summariesRes, attendanceRes] = await Promise.all([
        fetch('/api/team-members'),
        fetch(`/api/analytics/daily?${params}`),
        fetch(`/api/attendance/records?${params}`),
      ]);

      const [membersResult, summariesResult, attendanceResult] = await Promise.all([
        membersRes.json(),
        summariesRes.json(),
        attendanceRes.json(),
      ]);

      if (membersResult.success && summariesResult.success) {
        const members: TeamMember[] = membersResult.data;
        const summaries: DailySummary[] = summariesResult.data;
        const attendanceRecords: AttendanceRecord[] = attendanceResult.success ? attendanceResult.records : [];

        const filteredMembers = members.filter((m) => selectedMembers.includes(m.id));

        const gridData: TeamMemberRow[] = filteredMembers.map((member) => {
          const dailyData = new Map<string, DayData>();
          let weekTotalClickup = 0;
          let weekTotalAttendance = 0;

          // ClickUp data
          summaries
            .filter((s) => s.teamMemberId === member.id)
            .forEach((summary) => {
              const dateKey = format(new Date(summary.date), 'yyyy-MM-dd');
              const existing = dailyData.get(dateKey) || emptyDay();
              existing.clickupHours = summary.totalHours;
              dailyData.set(dateKey, existing);
              weekTotalClickup += summary.totalHours;
            });

          // Attendance data
          const matched = attendanceRecords.filter((r) => {
            const aName = r.employeeName.toLowerCase().trim();
            const mName = member.username.toLowerCase().trim();
            return mName.includes(aName) || aName.includes(mName);
          });

          matched.forEach((record) => {
            const recordDate = new Date(record.date);
            const dateKey = format(recordDate, 'yyyy-MM-dd');
            if (recordDate >= weekStart && recordDate <= weekEnd) {
              const existing = dailyData.get(dateKey) || emptyDay();
              existing.attendanceHours = record.totalHours;
              existing.attendanceStatus = record.status;
              existing.firstIn = record.firstIn;
              existing.lastOut = record.lastOut;
              try { existing.inOutPeriods = JSON.parse((record as any).inOutPeriods || '[]'); } catch { existing.inOutPeriods = []; }
              try { existing.unpairedIns = JSON.parse((record as any).unpairedIns || '[]'); } catch { existing.unpairedIns = []; }
              try { existing.unpairedOuts = JSON.parse((record as any).unpairedOuts || '[]'); } catch { existing.unpairedOuts = []; }
              dailyData.set(dateKey, existing);
              weekTotalAttendance += record.totalHours;
            }
          });

          return { member, dailyData, weekTotalClickup, weekTotalAttendance };
        });

        setTeamData(gridData);
      }
    } catch (err) {
      console.error('Failed to fetch timesheet data:', err);
    } finally {
      setLoading(false);
    }
  };

  function emptyDay(): DayData {
    return { clickupHours: 0, attendanceHours: 0, attendanceStatus: null, inOutPeriods: [], unpairedIns: [], unpairedOuts: [], firstIn: null, lastOut: null };
  }

  const getDayData = (row: TeamMemberRow, day: Date): DayData =>
    row.dailyData.get(format(day, 'yyyy-MM-dd')) || emptyDay();

  // Has any day where member was present (attendanceStatus PRESENT) but 0h ClickUp
  const hasZeroLogDay = (row: TeamMemberRow): boolean =>
    Array.from(row.dailyData.values()).some(
      (d) => d.attendanceStatus === 'PRESENT' && d.clickupHours === 0
    );

  // Count days member was physically present
  const presentDayCount = (row: TeamMemberRow): number =>
    Array.from(row.dailyData.values()).filter(
      (d) => d.attendanceStatus === 'PRESENT'
    ).length;

  // Capacity Utilization: ClickUp ÷ 40h (fixed denominator — always the full expected week)
  const memberCapUtil = (row: TeamMemberRow): number =>
    Math.min(150, Math.round((row.weekTotalClickup / 40) * 100));

  // Presence-Adjusted Utilization: ClickUp ÷ (days present × 8h)
  // Isolates logging discipline from attendance patterns
  const memberPresUtil = (row: TeamMemberRow): number => {
    const pDays = presentDayCount(row);
    if (pDays === 0) return 0;
    return Math.min(150, Math.round((row.weekTotalClickup / (pDays * 8)) * 100));
  };

  type UtilQuadrant = 'healthy' | 'attendance-issue' | 'logging-gap' | 'both-issues';

  const getUtilQuadrant = (cap: number, pres: number): UtilQuadrant => {
    if (cap >= 60 && pres >= 60) return 'healthy';
    if (cap < 60 && pres >= 60) return 'attendance-issue';
    if (cap >= 60 && pres < 60) return 'logging-gap';
    return 'both-issues';
  };

  const QUADRANT_INFO = {
    'healthy': { label: 'Healthy', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Present and logging consistently. Work is visible in the system.' },
    'attendance-issue': { label: 'Low attendance', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200', desc: 'Logs well on days present — but attendance is below expected.' },
    'logging-gap': { label: 'Logging gap', badgeClass: 'bg-red-100 text-red-700 border-red-200', desc: 'Present most days but not logging while there. Most common Design Ops problem.' },
    'both-issues': { label: 'Needs attention', badgeClass: 'bg-red-100 text-red-700 border-red-200', desc: 'Rarely in office and not logging when present. Needs most immediate attention.' },
  } as const;

  const memberGap = (row: TeamMemberRow): number =>
    row.weekTotalClickup - row.weekTotalAttendance;

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Timesheet & Attendance Grid</CardTitle>
          <CardDescription>Loading timesheet data…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
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

  // ── Totals row ────────────────────────────────────────────────────────────

  const teamClickupTotal = teamData.reduce((s, r) => s + r.weekTotalClickup, 0);
  const teamAttendanceTotal = teamData.reduce((s, r) => s + r.weekTotalAttendance, 0);
  const teamAccuracy = teamAttendanceTotal > 0
    ? Math.round((teamClickupTotal / teamAttendanceTotal) * 100)
    : 0;
  const teamUnaccounted = Math.max(0, teamAttendanceTotal - teamClickupTotal);

  // Working days for the shown week (Mon–Fri only)
  const workDays = weekDays.filter((d) => d.getDay() !== 0 && d.getDay() !== 6);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Timesheet &amp; Attendance Grid</CardTitle>
              <CardDescription>
                {weekDays.length > 0 &&
                  `${format(weekDays[0], 'MMM d')} – ${format(weekDays[weekDays.length - 1], 'MMM d, yyyy')}`}
              </CardDescription>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-2 rounded-sm bg-indigo-400" /> ClickUp
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-2 rounded-sm bg-sky-400" /> Attendance
              </span>
              <span className="flex items-center gap-1 text-red-400">● Under-logged</span>
              <span className="flex items-center gap-1 text-amber-400">● Minor gap</span>
              <span className="flex items-center gap-1 text-emerald-500">● On track</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 pb-4">
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={300}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    {/* Member column */}
                    <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-white z-10 border-r w-48">
                      MEMBER
                    </th>
                    {/* One column per day */}
                    {weekDays.map((day) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <th
                          key={day.toISOString()}
                          className={`text-center px-2 py-3 font-medium border-r ${isWeekend ? 'bg-gray-50 text-gray-400' : 'text-gray-600'}`}
                          style={{ minWidth: 110 }}
                        >
                          <div className="text-[11px] font-semibold">{format(day, 'EEE').toUpperCase()}</div>
                          <div className="text-[10px] font-normal text-gray-400">{format(day, 'MMM d')}</div>
                        </th>
                      );
                    })}
                    {/* Summary columns */}
                    <th className="text-center px-3 py-3 w-36 border-l">
                      <div className="text-[11px] font-semibold text-indigo-600">ClickUp Utilisation</div>
                      <div className="text-[10px] font-normal text-gray-400 mt-0.5">vs 40h expected capacity</div>
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {teamData.map((row) => {
                    const atRisk = hasZeroLogDay(row);
                    const cap = memberCapUtil(row);
                    const pres = memberPresUtil(row);
                    const pDays = presentDayCount(row);
                    const quad = getUtilQuadrant(cap, pres);
                    const gap = memberGap(row);
                    const initials = row.member.username.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                    // Count zero-log days for tooltip
                    const zeroLogDayCount = Array.from(row.dailyData.values()).filter(
                      (d) => d.attendanceStatus === 'PRESENT' && d.clickupHours === 0
                    ).length;

                    return (
                      <tr
                        key={row.member.id}
                        className={`border-b hover:bg-gray-50/40 transition-colors ${atRisk ? 'border-l-2 border-l-red-400' : ''}`}
                      >
                        {/* Member cell */}
                        <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r">
                          <div className="flex items-center gap-2">
                            {row.member.profilePicture ? (
                              <img src={row.member.profilePicture} alt={row.member.username} className="w-8 h-8 rounded-full flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-gray-900 text-sm truncate">{row.member.username}</span>
                                {atRisk && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[220px] text-xs leading-snug">
                                      <p className="font-semibold text-amber-600 mb-1">⚠️ Zero-log risk</p>
                                      <p>
                                        <strong>{zeroLogDayCount} day{zeroLogDayCount !== 1 ? 's' : ''}</strong> this week where{' '}
                                        {row.member.username.split(' ')[0]} was present in the office but logged <strong>0h in ClickUp</strong>.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400">40h / week</div>
                            </div>
                          </div>
                        </td>

                        {/* Day cells */}
                        {weekDays.map((day) => {
                          const dayData = getDayData(row, day);
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          const isPresent = dayData.attendanceStatus === 'PRESENT';

                          return (
                            <DayCell
                              key={`cell-${row.member.id}-${day.toISOString()}`}
                              dayData={dayData}
                              isWeekend={isWeekend}
                              isPresent={isPresent}
                              onClick={() => {
                                setSelectedDayMember({ id: row.member.id, name: row.member.username });
                                setSelectedDayDate(day);
                                setSelectedDayData(dayData);
                                setDayCellModalOpen(true);
                              }}
                            />
                          );
                        })}

                        {/* ClickUp Utilisation cell */}
                        <td className="text-center px-3 py-2 align-middle border-l">
                          {row.weekTotalClickup > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col items-center gap-1 cursor-help">
                                  {/* Large capacity utilization % */}
                                  <span className={`text-xl font-bold tabular-nums leading-tight ${cap >= 80 ? 'text-emerald-600' : cap >= 60 ? 'text-amber-500' : 'text-red-500'
                                    }`}>
                                    {cap}%
                                  </span>
                                  {/* Quadrant badge pill */}
                                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${QUADRANT_INFO[quad].badgeClass}`}>
                                    {QUADRANT_INFO[quad].label}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="w-[220px] text-xs leading-snug p-3">
                                {/* Tooltip rows */}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">ClickUp logged</span>
                                    <strong className="tabular-nums">{fmtHours(row.weekTotalClickup)}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Expected capacity</span>
                                    <strong>40h</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Days present</span>
                                    <strong>{pDays}/5</strong>
                                  </div>
                                  {/* Presence-adjusted section — only when < 5 days present */}
                                  {pDays > 0 && pDays < 5 && (
                                    <>
                                      <div className="border-t my-1" />
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Present-day util</span>
                                        <strong className={pres >= 80 ? 'text-emerald-600' : pres >= 60 ? 'text-amber-500' : 'text-red-500'}>
                                          {pres}%
                                        </strong>
                                      </div>
                                      <div className="text-[10px] text-gray-400 font-mono">
                                        ClickUp ÷ ({pDays}d × 8h)
                                      </div>
                                    </>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-gray-300">–</span>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>

                {/* ── Footer totals ── */}
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                    {/* Sticky label cell */}
                    <td className="px-4 py-3 sticky left-0 bg-gray-50 z-10 border-r whitespace-nowrap">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team Totals</span>
                    </td>
                    {/* Stats span ALL remaining columns (days + Utilisation) */}
                    <td colSpan={weekDays.length + 1} className="px-4 py-3">
                      <div className="flex items-center gap-6 text-xs text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-indigo-400" />
                          <span>ClickUp: <strong className="text-gray-800">{fmtHours(teamClickupTotal)}</strong></span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-sky-400" />
                          <span>Attendance: <strong className="text-gray-800">{fmtHours(teamAttendanceTotal)}</strong></span>
                        </span>
                        <span className="h-3.5 w-px bg-gray-300" />
                        <span>
                          Team accuracy:{' '}
                          <strong className={teamAccuracy >= 80 ? 'text-emerald-600' : teamAccuracy >= 60 ? 'text-amber-600' : 'text-red-600'}>
                            {teamAccuracy}%
                          </strong>
                        </span>
                        <span>
                          Unaccounted:{' '}
                          <strong className={teamUnaccounted > 0 ? 'text-red-500' : 'text-emerald-600'}>
                            {teamUnaccounted > 0 ? fmtHours(teamUnaccounted) : 'None'}
                          </strong>
                        </span>
                        <span className="ml-auto flex items-center gap-1 text-amber-500 whitespace-nowrap">
                          <span>⚠️</span>
                          <span className="text-gray-400">=&nbsp;present but 0h ClickUp logged</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* ── Day Cell Modal ── */}
      <DayCellModal
        open={dayCellModalOpen}
        onOpenChange={setDayCellModalOpen}
        dayData={selectedDayData}
        memberId={selectedDayMember?.id || null}
        memberName={selectedDayMember?.name || ''}
        date={selectedDayDate}
      />
    </>
  );
}

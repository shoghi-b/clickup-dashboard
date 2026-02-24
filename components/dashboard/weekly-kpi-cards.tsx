'use client';

import { useMemo } from 'react';
import { AlertTriangle, Clock, TrendingDown, CalendarCheck, Target, Activity } from 'lucide-react';

interface MemberDay {
  date: string;
  attendance: number;
  clickup: number;
  isPresent: boolean;
  status: string;
}

interface Member {
  id: string;
  name: string;
  days: MemberDay[];
  total: number;
  utilization: number;
  attendanceCompliance: boolean;
  timesheetCompliance: boolean;
}

type Severity = 'good' | 'warn' | 'critical' | 'neutral';

interface KPICardProps {
  label: string;
  value: string;
  subtitle: string;
  detail?: string;
  severity: Severity;
  icon: React.ReactNode;
  onClick?: () => void;
}

function formatHours(hours: number): string {
  if (hours <= 0) return '0m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function KPICard({ label, value, subtitle, detail, severity, icon, onClick }: KPICardProps) {
  const palette: Record<Severity, { wrap: string; val: string; lbl: string }> = {
    good: { wrap: 'border-emerald-100 bg-emerald-50/40', val: 'text-emerald-600', lbl: 'text-emerald-700' },
    warn: { wrap: 'border-amber-100  bg-amber-50/40', val: 'text-amber-600', lbl: 'text-amber-700' },
    critical: { wrap: 'border-red-100    bg-red-50/40', val: 'text-red-600', lbl: 'text-red-700' },
    neutral: { wrap: 'border-gray-100   bg-gray-50/30', val: 'text-gray-800', lbl: 'text-gray-500' },
  };
  const c = palette[severity];

  return (
    <div
      className={`rounded-xl border ${c.wrap} p-4 flex flex-col gap-1 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${c.lbl}`}>
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold tracking-tight ${c.val}`}>{value}</div>
      <div className="text-xs text-gray-500 leading-snug">{subtitle}</div>
      {detail && (
        <div className="text-xs text-gray-400 leading-snug mt-0.5 truncate" title={detail}>
          {detail}
        </div>
      )}
    </div>
  );
}

export interface WeeklyKPICardsProps {
  kpiData: {
    attendanceCompliance: number;
    timesheetCompliance: number;
    presentNotLogged: number;
    avgUtilization: number;
    overCapacity: number;
    underCapacity: number;
  };
  members?: Member[];
  weekDayCount?: number;
  onCardClick: (metric: string) => void;
}

export function WeeklyKPICards({ kpiData, members = [], weekDayCount = 5, onCardClick }: WeeklyKPICardsProps) {
  const kpis = useMemo(() => {
    let totalClickup = 0;
    let totalAttendance = 0;
    let zeroLogDays = 0;
    const highDivNames: string[] = [];
    const streakRiskNames: string[] = [];
    const daysWithData = new Set<string>();

    members.forEach((m) => {
      let mClickup = 0;
      let mAttendance = 0;
      let hasHighDiv = false;
      let hasStreakRisk = false;

      m.days.forEach((d) => {
        mClickup += d.clickup;
        mAttendance += d.attendance;

        if (d.clickup > 0 || d.attendance > 0) daysWithData.add(d.date);
        if (d.isPresent && d.clickup === 0) zeroLogDays++;

        // High divergence: present and the gap between attendance and clickup > 2h
        if (d.isPresent && d.attendance > 0 && (d.attendance - d.clickup) > 2) {
          hasHighDiv = true;
        }
        // Streak risk: present but less than 1h ClickUp logged
        if (d.isPresent && d.clickup < 1) hasStreakRisk = true;
      });

      totalClickup += mClickup;
      totalAttendance += mAttendance;
      if (hasHighDiv) highDivNames.push(m.name);
      if (hasStreakRisk) streakRiskNames.push(m.name);
    });

    const loggingAccuracy = totalAttendance > 0
      ? Math.round((totalClickup / totalAttendance) * 100)
      : 0;
    const unaccountedHours = Math.max(0, totalAttendance - totalClickup);
    const weekCoverage = weekDayCount > 0
      ? Math.min(100, Math.round((daysWithData.size / weekDayCount) * 100))
      : 0;

    return {
      loggingAccuracy,
      unaccountedHours,
      highDivCount: highDivNames.length,
      highDivNames,
      streakRiskCount: streakRiskNames.length,
      streakRiskNames,
      zeroLogDays,
      weekCoverage,
      daysLoaded: daysWithData.size,
    };
  }, [members, weekDayCount]);

  const nameList = (names: string[]) =>
    names.length === 0
      ? undefined
      : names.slice(0, 4).join(', ') + (names.length > 4 ? ` +${names.length - 4}` : '');

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {/* 1 — Logging Accuracy */}
      <KPICard
        label="Logging Accuracy"
        value={`${kpis.loggingAccuracy}%`}
        subtitle="ClickUp ÷ Attendance hours"
        detail={
          kpis.loggingAccuracy < 60
            ? 'Project cost data at risk'
            : kpis.loggingAccuracy < 80
              ? 'Partially trustworthy'
              : 'Data looks reliable'
        }
        severity={kpis.loggingAccuracy >= 80 ? 'good' : kpis.loggingAccuracy >= 60 ? 'warn' : 'critical'}
        icon={<Target className="h-3 w-3" />}
        onClick={() => onCardClick('loggingAccuracy')}
      />

      {/* 2 — Unaccounted Hours */}
      <KPICard
        label="Unaccounted Hours"
        value={formatHours(kpis.unaccountedHours)}
        subtitle="Present, zero ClickUp logged"
        detail={`Across ${members.length} member${members.length !== 1 ? 's' : ''} this week`}
        severity={kpis.unaccountedHours === 0 ? 'good' : kpis.unaccountedHours < 10 ? 'warn' : 'critical'}
        icon={<Clock className="h-3 w-3" />}
        onClick={() => onCardClick('unaccountedHours')}
      />

      {/* 3 — High Divergence */}
      <KPICard
        label="High Divergence"
        value={String(kpis.highDivCount)}
        subtitle="Members with >2h daily gap"
        detail={nameList(kpis.highDivNames)}
        severity={kpis.highDivCount === 0 ? 'good' : kpis.highDivCount <= 2 ? 'warn' : 'critical'}
        icon={<TrendingDown className="h-3 w-3" />}
        onClick={() => onCardClick('highDivergence')}
      />

      {/* 4 — Streak Risk */}
      <KPICard
        label="Streak Risk"
        value={String(kpis.streakRiskCount)}
        subtitle="Not logging despite attendance"
        detail={nameList(kpis.streakRiskNames)}
        severity={kpis.streakRiskCount === 0 ? 'good' : kpis.streakRiskCount <= 2 ? 'warn' : 'critical'}
        icon={<AlertTriangle className="h-3 w-3" />}
        onClick={() => onCardClick('streakRisk')}
      />

      {/* 5 — Zero Log Days */}
      <KPICard
        label="Zero Log Days"
        value={String(kpis.zeroLogDays)}
        subtitle="Days: present, not logged"
        detail="Individual present-but-zero instances"
        severity={kpis.zeroLogDays === 0 ? 'good' : kpis.zeroLogDays <= 3 ? 'warn' : 'critical'}
        icon={<Activity className="h-3 w-3" />}
        onClick={() => onCardClick('zeroLogDays')}
      />

      {/* 6 — Week Coverage */}
      <KPICard
        label="Week Coverage"
        value={`${kpis.weekCoverage}%`}
        subtitle={
          kpis.weekCoverage === 100
            ? 'Full week loaded'
            : `${kpis.daysLoaded} of ${weekDayCount} days have data`
        }
        detail={members.length > 0 ? `${members.length} members tracked` : undefined}
        severity={kpis.weekCoverage === 100 ? 'good' : 'neutral'}
        icon={<CalendarCheck className="h-3 w-3" />}
        onClick={() => onCardClick('weekCoverage')}
      />
    </div>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status: 'good' | 'warning' | 'critical';
  onClick?: () => void;
  context?: string;
}

function KPICard({ title, value, subtitle, trend, trendValue, status, onClick, context }: KPICardProps) {
  const statusColors = {
    good: 'border-green-200 hover:border-green-400 bg-green-50/30',
    warning: 'border-yellow-200 hover:border-yellow-400 bg-yellow-50/30',
    critical: 'border-red-200 hover:border-red-400 bg-red-50/30',
  };

  const valueColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
  };

  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-green-600" />,
    down: <TrendingDown className="h-4 w-4 text-red-600" />,
    neutral: <Minus className="h-4 w-4 text-gray-400" />,
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${statusColors[status]} ${onClick ? 'hover:shadow-lg' : ''
        }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className={`text-3xl font-bold ${valueColors[status]}`}>{value}</div>
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-sm">
              {trendIcons[trend]}
              <span className="text-gray-600">{trendValue}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
        {context && (
          <p className="text-xs text-gray-400 mt-1 italic">{context}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface WeeklyKPICardsProps {
  kpiData: {
    attendanceCompliance: number;
    timesheetCompliance: number;
    presentNotLogged: number;
    avgUtilization: number;
    overCapacity: number;
    underCapacity: number;
  };
  onCardClick: (metric: string) => void;
}

export function WeeklyKPICards({ kpiData, onCardClick }: WeeklyKPICardsProps) {
  const getComplianceStatus = (rate: number): 'good' | 'warning' | 'critical' => {
    if (rate >= 80) return 'good';
    if (rate >= 60) return 'warning';
    return 'critical';
  };

  const getUtilizationStatus = (util: number): 'good' | 'warning' | 'critical' => {
    if (util >= 70 && util <= 85) return 'good';
    if (util >= 60 && util < 90) return 'warning';
    return 'critical';
  };

  const getCountStatus = (count: number): 'good' | 'warning' | 'critical' => {
    if (count === 0) return 'good';
    if (count <= 2) return 'warning';
    return 'critical';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard
        title="Attendance Compliance"
        value={`${kpiData.attendanceCompliance}%`}
        subtitle={
          kpiData.attendanceCompliance >= 80
            ? '✓ Team is showing up'
            : '⚠ Attendance problem'
        }
        context="% of team members present ≥4 days/week"
        status={getComplianceStatus(kpiData.attendanceCompliance)}
        trend={kpiData.attendanceCompliance >= 80 ? 'up' : 'down'}
        trendValue="vs last week"
        onClick={() => onCardClick('attendanceCompliance')}
      />

      <KPICard
        title="Timesheet Compliance"
        value={`${kpiData.timesheetCompliance}%`}
        subtitle={
          kpiData.timesheetCompliance >= 80
            ? '✓ Good logging discipline'
            : '⚠ Data cannot be trusted'
        }
        context="% of team logging ≥4 days/week"
        status={getComplianceStatus(kpiData.timesheetCompliance)}
        trend={kpiData.timesheetCompliance >= 80 ? 'up' : 'down'}
        trendValue="vs last week"
        onClick={() => onCardClick('timesheetCompliance')}
      />

      <KPICard
        title="Present, Not Logged"
        value={kpiData.presentNotLogged}
        subtitle={
          kpiData.presentNotLogged === 0
            ? '✓ All present members logging'
            : '🚨 Critical issue'
        }
        context="Members at office but not tracking time"
        status={getCountStatus(kpiData.presentNotLogged)}
        onClick={() => onCardClick('presentNotLogged')}
      />

      <KPICard
        title="Avg Utilization"
        value={`${kpiData.avgUtilization}%`}
        subtitle={
          kpiData.avgUtilization >= 70 && kpiData.avgUtilization <= 85
            ? '✓ Healthy utilization'
            : kpiData.avgUtilization < 60
              ? '⚠ Underutilized'
              : '⚠ Risk of burnout'
        }
        context="Average hours logged vs expected (70-85% ideal)"
        status={getUtilizationStatus(kpiData.avgUtilization)}
        trend={
          kpiData.avgUtilization >= 70 && kpiData.avgUtilization <= 85
            ? 'neutral'
            : kpiData.avgUtilization < 70
              ? 'down'
              : 'up'
        }
        trendValue="vs last week"
        onClick={() => onCardClick('avgUtilization')}
      />

      <KPICard
        title="Over Capacity"
        value={kpiData.overCapacity}
        subtitle={
          kpiData.overCapacity === 0
            ? '✓ No burnout risk'
            : '⚠ Hidden burnout risk'
        }
        context="Members logging >85% utilization"
        status={getCountStatus(kpiData.overCapacity)}
        onClick={() => onCardClick('overCapacity')}
      />

      <KPICard
        title="Under Capacity"
        value={kpiData.underCapacity}
        subtitle={
          kpiData.underCapacity === 0
            ? '✓ Good capacity balance'
            : '⚠ Review allocation'
        }
        context="Members logging <60% utilization"
        status={getCountStatus(kpiData.underCapacity)}
        onClick={() => onCardClick('underCapacity')}
      />
    </div>
  );
}

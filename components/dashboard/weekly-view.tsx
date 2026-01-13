'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComplianceBadge } from '@/components/compliance-badge';
import { UtilizationBadge } from '@/components/utilization-badge';
import { RiskIndicators } from '@/components/risk-indicators';
import { format } from 'date-fns';

interface WeeklySummary {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  activeDays: number;
  complianceStatus: 'FULLY_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT';
  utilizationPercent: number;
  utilizationCategory: 'UNDER' | 'HEALTHY' | 'OVER';
  hasUnderLogging: boolean;
  hasOverwork: boolean;
  hasExcessiveBackfill: boolean;
  teamMember: {
    id: string;
    username: string;
    email: string | null;
    profilePicture: string | null;
  };
}

interface WeeklyViewProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function WeeklyView({ dateRange }: WeeklyViewProps) {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklySummaries();
  }, [dateRange]);

  const fetchWeeklySummaries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      const response = await fetch(`/api/analytics/weekly?${params}`);
      const result = await response.json();

      if (result.success) {
        setSummaries(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch weekly summaries:', error);
    } finally {
      setLoading(false);
    }
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

  if (summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Summary</CardTitle>
          <CardDescription>No data available. Click "Sync Data" to fetch timesheet data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Summary</CardTitle>
        <CardDescription>Team timesheet compliance and utilization for the current week</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Member</TableHead>
              <TableHead>Week</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Active Days</TableHead>
              <TableHead>Utilization</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Risk Signals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((summary) => (
              <TableRow key={summary.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {summary.teamMember.profilePicture && (
                      <img
                        src={summary.teamMember.profilePicture}
                        alt={summary.teamMember.username}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <div>{summary.teamMember.username}</div>
                      {summary.teamMember.email && (
                        <div className="text-xs text-gray-500">{summary.teamMember.email}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(summary.weekStartDate), 'MMM d')} -{' '}
                    {format(new Date(summary.weekEndDate), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell>{summary.totalHours.toFixed(1)}h</TableCell>
                <TableCell>{summary.activeDays}/5</TableCell>
                <TableCell>
                  <UtilizationBadge
                    category={summary.utilizationCategory}
                    percentage={summary.utilizationPercent}
                  />
                </TableCell>
                <TableCell>
                  <ComplianceBadge status={summary.complianceStatus} />
                </TableCell>
                <TableCell>
                  <RiskIndicators
                    hasUnderLogging={summary.hasUnderLogging}
                    hasOverwork={summary.hasOverwork}
                    hasExcessiveBackfill={summary.hasExcessiveBackfill}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


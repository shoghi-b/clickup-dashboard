'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComplianceBadge } from '@/components/compliance-badge';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface DailySummary {
  id: string;
  date: string;
  totalHours: number;
  entryCount: number;
  sameDayEntries: number;
  backfilledEntries: number;
  complianceStatus: 'FULLY_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT';
  utilizationPercent: number;
  meetsMinimum: boolean;
  isSameDay: boolean;
  teamMember: {
    id: string;
    username: string;
    email: string | null;
    profilePicture: string | null;
  };
}

interface DailyViewProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function DailyView({ dateRange }: DailyViewProps) {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailySummaries();
  }, [dateRange]);

  const fetchDailySummaries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      const response = await fetch(`/api/analytics/daily?${params}`);
      const result = await response.json();

      if (result.success) {
        setSummaries(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch daily summaries:', error);
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
          <CardTitle>Daily Summary</CardTitle>
          <CardDescription>No data available. Click "Sync Data" to fetch timesheet data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Summary</CardTitle>
        <CardDescription>Daily timesheet compliance and logging behavior</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Member</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Entries</TableHead>
              <TableHead>Same-Day</TableHead>
              <TableHead>Backfilled</TableHead>
              <TableHead>Utilization</TableHead>
              <TableHead>Compliance</TableHead>
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
                  {format(new Date(summary.date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {summary.totalHours.toFixed(1)}h
                    {summary.meetsMinimum && (
                      <Badge className="bg-green-100 text-green-800 text-xs">≥6h</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{summary.entryCount}</TableCell>
                <TableCell>
                  <Badge className="bg-blue-100 text-blue-800">
                    {summary.sameDayEntries}
                  </Badge>
                </TableCell>
                <TableCell>
                  {summary.backfilledEntries > 0 ? (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {summary.backfilledEntries}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      summary.utilizationPercent >= 70
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }
                  >
                    {summary.utilizationPercent.toFixed(0)}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <ComplianceBadge status={summary.complianceStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


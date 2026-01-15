'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MemberKPI {
  id: string;
  teamMember: {
    id: string;
    username: string;
    email: string | null;
    profilePicture: string | null;
  };
  attendanceCompliance: boolean;
  timesheetCompliance: boolean;
  presentNotLogged: boolean;
  utilization: number;
  utilizationStatus: string;
  riskLevel: string;
  actionRequired: string | null;
}

interface MemberKPIListProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function MemberKPIList({ dateRange }: MemberKPIListProps) {
  const [memberKPIs, setMemberKPIs] = useState<MemberKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');

  useEffect(() => {
    fetchMemberKPIs();
  }, [dateRange, filter]);

  const fetchMemberKPIs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periodType: 'WEEKLY',
        date: dateRange.from.toISOString(),
      });
      
      if (filter !== 'ALL') {
        params.append('riskLevel', filter);
      }

      const response = await fetch(`/api/kpi/members?${params}`);
      const result = await response.json();

      if (result.success) {
        setMemberKPIs(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch member KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return <Badge className="bg-red-600">Critical</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-600">High</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-600">Medium</Badge>;
      case 'LOW':
        return <Badge className="bg-green-600">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getUtilizationIcon = (status: string) => {
    switch (status) {
      case 'OVER':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'UNDER':
        return <TrendingDown className="h-4 w-4 text-yellow-600" />;
      case 'HEALTHY':
        return <Minus className="h-4 w-4 text-green-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Loading member KPIs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Member KPIs</CardTitle>
            <CardDescription>Individual accountability and capacity metrics</CardDescription>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 text-sm rounded ${filter === 'ALL' ? 'bg-black text-white' : 'bg-gray-100'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('CRITICAL')}
              className={`px-3 py-1 text-sm rounded ${filter === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
            >
              Critical
            </button>
            <button
              onClick={() => setFilter('HIGH')}
              className={`px-3 py-1 text-sm rounded ${filter === 'HIGH' ? 'bg-orange-600 text-white' : 'bg-gray-100'}`}
            >
              High
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="text-center">Attendance</TableHead>
              <TableHead className="text-center">Timesheet</TableHead>
              <TableHead className="text-center">Utilization</TableHead>
              <TableHead className="text-center">Risk Level</TableHead>
              <TableHead>Action Required</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberKPIs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No member KPIs found. Calculate KPIs first.
                </TableCell>
              </TableRow>
            ) : (
              memberKPIs.map((kpi) => (
                <TableRow key={kpi.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {kpi.teamMember.profilePicture && (
                        <img
                          src={kpi.teamMember.profilePicture}
                          alt={kpi.teamMember.username}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <div>{kpi.teamMember.username}</div>
                        {kpi.teamMember.email && (
                          <div className="text-xs text-gray-500">{kpi.teamMember.email}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {kpi.attendanceCompliance ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {kpi.timesheetCompliance ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {getUtilizationIcon(kpi.utilizationStatus)}
                      <span className="text-sm">{kpi.utilization.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getRiskBadge(kpi.riskLevel)}
                  </TableCell>
                  <TableCell>
                    {kpi.actionRequired ? (
                      <p className="text-xs text-gray-600">{kpi.actionRequired}</p>
                    ) : (
                      <span className="text-xs text-gray-400">No action needed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


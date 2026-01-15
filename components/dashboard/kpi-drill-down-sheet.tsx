'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface MemberDetail {
  id: string;
  name: string;
  status: string;
  days: {
    date: string;
    attendance?: number;
    clickup?: number;
    status: 'present' | 'absent' | 'partial' | 'missing';
  }[];
  total: number;
  metric?: number; // The specific metric value (e.g., utilization %, compliance)
}

interface KPIDrillDownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: string;
  title: string;
  description: string;
  members: MemberDetail[];
}

export function KPIDrillDownSheet({
  open,
  onOpenChange,
  metric,
  title,
  description,
  members,
}: KPIDrillDownSheetProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-600">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-600">Absent</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-600">Partial</Badge>;
      case 'missing':
        return <Badge variant="outline">Missing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDayStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'missing':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="space-y-2 pb-6 border-b">
          <SheetTitle className="text-2xl font-bold">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {members.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900">All clear!</p>
              <p className="text-sm text-gray-500 mt-1">No members affected by this metric</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Affected Members</p>
                  <p className="text-2xl font-bold text-gray-900">{members.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total ClickUp Hours</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {members.reduce((sum, m) => sum + m.total, 0).toFixed(1)}h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Attendance Hours</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {members.reduce((sum, m) => sum + m.days.reduce((s, d) => s + (d.attendance || 0), 0), 0).toFixed(1)}h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Utilization</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {members.length > 0
                      ? (members.reduce((sum, m) => sum + (m.metric || 0), 0) / members.length).toFixed(1)
                      : '0'}%
                  </p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 text-xs text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">CU:</span>
                  <span>ClickUp Hours Logged</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">AT:</span>
                  <span>Attendance Hours</span>
                </div>
                <div className="flex items-center gap-4 ml-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                    <span>Present & Logged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
                    <span>Partial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                    <span>Present Not Logged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
                    <span>Missing</span>
                  </div>
                </div>
              </div>

              {/* Member Details Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Member</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      {members[0]?.days.map((day, idx) => (
                        <TableHead key={idx} className="text-center">
                          {format(new Date(day.date), 'EEE')}
                          <br />
                          <span className="text-xs text-gray-500">
                            {format(new Date(day.date), 'MM/dd')}
                          </span>
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Total</TableHead>
                      {metric === 'avgUtilization' && (
                        <TableHead className="text-center">Utilization</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(member.status)}
                        </TableCell>
                        {member.days.map((day, idx) => (
                          <TableCell key={idx} className="text-center">
                            <div className={`inline-block px-3 py-2 rounded text-xs font-medium ${getDayStatusColor(day.status)}`}>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-500">CU:</span>
                                  <span className="font-semibold">
                                    {day.clickup !== undefined && day.clickup > 0 ? `${day.clickup.toFixed(1)}h` : '-'}
                                  </span>
                                </div>
                                {day.attendance !== undefined && day.attendance > 0 && (
                                  <div className="flex items-center gap-1 border-t border-gray-300 pt-1">
                                    <span className="text-[10px] text-gray-500">AT:</span>
                                    <span className="font-semibold">
                                      {day.attendance.toFixed(1)}h
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-semibold">
                          {member.total.toFixed(1)}h
                        </TableCell>
                        {metric === 'avgUtilization' && member.metric !== undefined && (
                          <TableCell className="text-center">
                            <span className={`font-semibold ${
                              member.metric >= 70 && member.metric <= 85
                                ? 'text-green-600'
                                : member.metric < 60
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              {member.metric.toFixed(1)}%
                            </span>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}


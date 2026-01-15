'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeCode: string | null;
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  totalHours: number;
  status: 'PRESENT' | 'ABSENT' | 'PARTIAL';
  shift: string | null;
}

interface AttendanceViewProps {
  startDate: Date;
  endDate: Date;
}

export function AttendanceView({ startDate, endDate }: AttendanceViewProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [groupedData, setGroupedData] = useState<Record<string, AttendanceRecord[]>>({});
  const [summary, setSummary] = useState({
    totalRecords: 0,
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    partialCount: 0,
    totalHours: 0,
    averageHoursPerDay: 0
  });

  useEffect(() => {
    fetchAttendanceData();
  }, [startDate, endDate]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const response = await fetch(`/api/attendance/records?${params}`);
      const result = await response.json();

      if (response.ok) {
        setRecords(result.records);
        setGroupedData(result.groupedByEmployee);
        setSummary(result.summary);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'ABSENT':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'PARTIAL':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'PRESENT':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Present</span>;
      case 'ABSENT':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Absent</span>;
      case 'PARTIAL':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Partial</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="flex flex-col items-center justify-center h-64">
          <Clock className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Data</h3>
          <p className="text-gray-600 text-center max-w-md">
            Upload an attendance sheet to see employee attendance records and hours.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-gray-100 hover:border-gray-900 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{summary.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-100 hover:border-green-600 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Present Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{summary.presentCount}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-100 hover:border-red-600 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Absent Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{summary.absentCount}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-100 hover:border-gray-900 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg Hours/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {summary.averageHoursPerDay.toFixed(1)}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Attendance Table */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">Employee Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">First IN</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Last OUT</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Hours</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{record.employeeName}</div>
                      {record.employeeCode && (
                        <div className="text-xs text-gray-500">Code: {record.employeeCode}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {format(new Date(record.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono">
                      {record.firstIn || '--:--'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono">
                      {record.lastOut || '--:--'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900">
                        {record.totalHours.toFixed(2)}h
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        {getStatusBadge(record.status)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


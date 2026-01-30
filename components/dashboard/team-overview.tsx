'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

interface TeamMember {
  id: string;
  username: string;
  email: string | null;
  profilePicture: string | null;
  role: string | null;
  expectedHoursPerDay: number;
  expectedHoursPerWeek: number;
  createdAt: string;
}

interface TeamOverviewProps {
  selectedMembers: string[];
  onToggleMember?: (memberId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export function TeamOverview({ selectedMembers, onToggleMember, onSelectAll, onDeselectAll }: TeamOverviewProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team-members');
      const result = await response.json();

      if (result.success) {
        setTeamMembers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (memberId: string) => {
    if (onToggleMember) {
      onToggleMember(memberId);
    }
  };

  const activeCount = selectedMembers.length;
  const totalCount = teamMembers.length;
  const allSelected = activeCount === totalCount && totalCount > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">
            Active Members: <span className="text-blue-600 font-semibold">{activeCount}/{totalCount}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Only active members will load data across all views
          </p>
        </div>
        <div className="flex gap-2">
          {allSelected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onDeselectAll}
            >
              Deselect All
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
            >
              Select All
            </Button>
          )}
        </div>
      </div>

      {/* Members table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Status</TableHead>
            <TableHead>Team Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Expected Hours/Day</TableHead>
            <TableHead>Expected Hours/Week</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamMembers.map((member) => {
            const isActive = selectedMembers.includes(member.id);
            return (
              <TableRow key={member.id} className={!isActive ? 'opacity-50' : ''}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggle(member.id)}
                    />
                    {isActive ? (
                      <span className="text-green-600 text-lg">🟢</span>
                    ) : (
                      <span className="text-gray-400 text-lg">⚪</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {member.profilePicture && (
                      <img
                        src={member.profilePicture}
                        alt={member.username}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <div>{member.username}</div>
                      {member.email && (
                        <div className="text-xs text-gray-500">{member.email}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {member.role ? (
                    <Badge variant="outline">{member.role}</Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>{member.expectedHoursPerDay}h</TableCell>
                <TableCell>{member.expectedHoursPerWeek}h</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

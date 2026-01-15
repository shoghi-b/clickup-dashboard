'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
}

export function TeamOverview({ selectedMembers }: TeamOverviewProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, [selectedMembers]);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team-members');
      const result = await response.json();

      if (result.success) {
        // Filter members based on selection
        const filteredMembers = result.data.filter((member: TeamMember) =>
          selectedMembers.includes(member.id)
        );
        setTeamMembers(filteredMembers);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
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

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
          <CardDescription>No team members found. Click "Sync Data" to fetch team data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Overview</CardTitle>
        <CardDescription>All team members and their work expectations</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Expected Hours/Day</TableHead>
              <TableHead>Expected Hours/Week</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => (
              <TableRow key={member.id}>
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
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


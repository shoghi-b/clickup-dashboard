'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TeamMember {
  id: string;
  username: string;
  email: string | null;
  profilePicture: string | null;
  role: string | null;
  expectedHoursPerDay: number;
  expectedHoursPerWeek: number;
  createdAt: string;
  hasPassword: boolean;
}

interface TeamOverviewProps {
  selectedMembers: string[];
  onToggleMember?: (memberId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

// Helper function to get initials from username
const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Helper function to generate a consistent color based on name
const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export function TeamOverview({ selectedMembers, onToggleMember, onSelectAll, onDeselectAll }: TeamOverviewProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedMemberForAccess, setSelectedMemberForAccess] = useState<TeamMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForAccess || !newPassword) return;

    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const response = await fetch('/api/team-members/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMemberForAccess.id,
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPasswordMessage({ type: 'success', text: 'Password set successfully' });
        setNewPassword('');
        // Refresh team members to update hasPassword status
        await fetchTeamMembers();
        // Close dialog after a brief delay
        setTimeout(() => {
          setPasswordDialogOpen(false);
          setSelectedMemberForAccess(null);
          setPasswordMessage(null);
        }, 1500);
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to set password' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOpenPasswordDialog = (member: TeamMember) => {
    setSelectedMemberForAccess(member);
    setPasswordDialogOpen(true);
    setNewPassword('');
    setPasswordMessage(null);
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
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            Active Members: <span className="text-primary font-semibold">{activeCount}/{totalCount}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
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
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="py-4 px-6 font-semibold">Team Member</TableHead>
              <TableHead className="py-4 px-6 font-semibold text-right w-[180px]">Status</TableHead>
              <TableHead className="py-4 px-6 font-semibold">Role</TableHead>
              <TableHead className="py-4 px-6 font-semibold text-center">Expected Hours/Day</TableHead>
              <TableHead className="py-4 px-6 font-semibold text-center">Expected Hours/Week</TableHead>
              <TableHead className="py-4 px-6 font-semibold w-[140px]">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => {
              const isActive = selectedMembers.includes(member.id);
              return (
                <TableRow key={member.id} className={!isActive ? 'opacity-60' : ''}>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-11 w-11 border-2 border-border">
                        {member.profilePicture && (
                          <AvatarImage src={member.profilePicture} alt={member.username} />
                        )}
                        <AvatarFallback className={`${getAvatarColor(member.username)} text-white font-semibold text-sm`}>
                          {getInitials(member.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-base truncate">{member.username}</div>
                        {member.email && (
                          <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => handleToggle(member.id)}
                      />
                      {isActive ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 font-medium px-3 py-1">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-300 text-gray-700 hover:bg-gray-400 font-medium px-3 py-1">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    {member.role ? (
                      <Badge variant="secondary" className="font-medium">{member.role}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 px-6 text-center">
                    <span className="font-semibold text-base">{member.expectedHoursPerDay}h</span>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-center">
                    <span className="font-semibold text-base">{member.expectedHoursPerWeek}h</span>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    {member.hasPassword ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPasswordDialog(member)}
                        className="h-7 text-xs"
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        Update
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPasswordDialog(member)}
                        className="h-7 text-xs"
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        Set Access
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Password Setting Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Access for {selectedMemberForAccess?.username}</DialogTitle>
            <DialogDescription>
              {selectedMemberForAccess?.hasPassword
                ? 'Update the password to change access for this team member.'
                : 'Set a password to enable login access for this team member.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSetPassword} className="space-y-4">
            {passwordMessage && (
              <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                {passwordMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {passwordMessage.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password-input">Password</Label>
              <Input
                id="password-input"
                type="text"
                placeholder="Enter password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={passwordLoading}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 6 characters. Share this securely with the team member.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setSelectedMemberForAccess(null);
                  setNewPassword('');
                  setPasswordMessage(null);
                }}
                disabled={passwordLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? 'Setting...' : selectedMemberForAccess?.hasPassword ? 'Update Password' : 'Set Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

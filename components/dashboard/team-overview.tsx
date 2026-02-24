'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Info } from 'lucide-react';
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
  visibleMembers: string[];
  onToggleMember?: (memberId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-orange-500', 'bg-teal-500', 'bg-cyan-500',
  ];
  return colors[name.charCodeAt(0) % colors.length];
};

export function TeamOverview({ visibleMembers, onToggleMember, onSelectAll, onDeselectAll }: TeamOverviewProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedMemberForAccess, setSelectedMemberForAccess] = useState<TeamMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team-members');
      const result = await response.json();
      if (result.success) setTeamMembers(result.data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
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
        body: JSON.stringify({ memberId: selectedMemberForAccess.id, password: newPassword }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPasswordMessage({ type: 'success', text: 'Password set successfully' });
        setNewPassword('');
        await fetchTeamMembers();
        setTimeout(() => {
          setPasswordDialogOpen(false);
          setSelectedMemberForAccess(null);
          setPasswordMessage(null);
        }, 1500);
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to set password' });
      }
    } catch {
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

  const shownCount = visibleMembers.length;
  const totalCount = teamMembers.length;
  const allShown = shownCount === totalCount && totalCount > 0;

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading team members...</div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">Master setup — </span>
          Members marked as <span className="font-semibold">Shown</span> will appear in Weekly Logs, Reports,
          and all views across the app. Members marked as <span className="font-semibold">Hidden</span> are
          excluded entirely. Your selection is saved automatically and persists every time the app is opened.
        </p>
      </div>

      {/* Header with counts and bulk controls */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            Showing in App:{' '}
            <span className="font-semibold text-primary">{shownCount}/{totalCount} members</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalCount - shownCount} member{totalCount - shownCount !== 1 ? 's' : ''} hidden from all views
          </p>
        </div>
        <div className="flex gap-2">
          {allShown ? (
            <Button variant="outline" size="sm" onClick={onDeselectAll}>
              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
              Hide All
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Show All
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
              <TableHead className="py-4 px-6 font-semibold text-right w-[200px]">Show in App</TableHead>
              <TableHead className="py-4 px-6 font-semibold">Role</TableHead>
              <TableHead className="py-4 px-6 font-semibold text-center">Exp. Hours/Day</TableHead>
              <TableHead className="py-4 px-6 font-semibold text-center">Exp. Hours/Week</TableHead>
              <TableHead className="py-4 px-6 font-semibold w-[140px]">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => {
              const isVisible = visibleMembers.includes(member.id);
              return (
                <TableRow key={member.id} className={!isVisible ? 'opacity-50' : ''}>
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
                        checked={isVisible}
                        onCheckedChange={() => onToggleMember?.(member.id)}
                      />
                      {isVisible ? (
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 font-medium px-3 py-1 min-w-[62px] justify-center">
                          <Eye className="mr-1 h-3 w-3" /> Shown
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-200 text-gray-600 hover:bg-gray-300 font-medium px-3 py-1 min-w-[62px] justify-center">
                          <EyeOff className="mr-1 h-3 w-3" /> Hidden
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPasswordDialog(member)}
                      className="h-7 text-xs"
                    >
                      <Lock className="w-3 h-3 mr-1" />
                      {member.hasPassword ? 'Update' : 'Set Access'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Password Dialog */}
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
              <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
              <p className="text-xs text-muted-foreground">Minimum 6 characters. Share securely with the team member.</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setPasswordDialogOpen(false); setSelectedMemberForAccess(null); setNewPassword(''); setPasswordMessage(null); }}
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

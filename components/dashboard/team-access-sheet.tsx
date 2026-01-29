'use client';

import { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeamMember {
    id: string;
    username: string;
    email: string | null;
    hasPassword: boolean;
}

interface TeamAccessSheetProps {
    teamMembers: TeamMember[];
    onUpdate: () => void;
}

export function TeamAccessSheet({ teamMembers, onUpdate }: TeamAccessSheetProps) {
    const [open, setOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember || !newPassword) return;

        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/team-members/access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memberId: selectedMember.id,
                    password: newPassword,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setMessage({ type: 'success', text: 'Password set successfully' });
                setNewPassword('');
                setSelectedMember(null); // Clear selection
                onUpdate(); // Refresh parent data
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to set password' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors">
                    <Users className="w-4 h-4 mr-2" />
                    Team Access
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Team Access Management</SheetTitle>
                    <SheetDescription>
                        Manage login access for your team members. Set passwords to enable them to log in.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {message && (
                        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {message.text}
                        </div>
                    )}

                    {selectedMember ? (
                        <div className="space-y-4 animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium">Set Password for {selectedMember.username}</h3>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedMember(null); setMessage(null); }}>Cancel</Button>
                            </div>
                            <form onSubmit={handleSetPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="text" // Visible for admin convenience (or could be password type)
                                        placeholder="Enter password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                    <p className="text-xs text-gray-500">Min 6 chars. Share this securely with the member.</p>
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Saving...' : 'Set Password'}
                                </Button>
                            </form>
                        </div>
                    ) : (
                        <ScrollArea className="h-[60vh] pr-4">
                            <div className="space-y-2">
                                {teamMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                                        onClick={() => { setSelectedMember(member); setMessage(null); }}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{member.username}</span>
                                            <span className="text-xs text-gray-500">{member.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {member.hasPassword ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">No Access</Badge>
                                            )}
                                            <Lock className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

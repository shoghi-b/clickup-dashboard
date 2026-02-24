'use client';

import { useDashboard } from '../dashboard-context';
import { TeamOverview } from '@/components/dashboard/team-overview';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function TeamSetupPage() {
    const { teamMembers, refreshData, visibleMembers, setVisibleMembers } = useDashboard();

    const handleToggleMember = (memberId: string) => {
        if (visibleMembers.includes(memberId)) {
            setVisibleMembers(visibleMembers.filter(id => id !== memberId));
        } else {
            setVisibleMembers([...visibleMembers, memberId]);
        }
    };

    const handleSelectAll = () => {
        setVisibleMembers(teamMembers.map(m => m.id));
    };

    const handleDeselectAll = () => {
        setVisibleMembers([]);
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Team Setup</h2>
                <p className="text-muted-foreground">
                    Control which members appear across Weekly Logs, Reports, and all views.
                    This is a one-time master setup — your selection persists every time the app is opened.
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Member Visibility</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TeamOverview
                            visibleMembers={visibleMembers}
                            onToggleMember={handleToggleMember}
                            onSelectAll={handleSelectAll}
                            onDeselectAll={handleDeselectAll}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

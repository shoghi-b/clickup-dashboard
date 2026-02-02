'use client';

import { useDashboard } from '../dashboard-context';
import { TeamOverview } from '@/components/dashboard/team-overview';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function TeamSetupPage() {
    const { teamMembers, refreshData, selectedMembers, setSelectedMembers } = useDashboard();

    const handleToggleMember = (memberId: string) => {
        if (selectedMembers.includes(memberId)) {
            setSelectedMembers(selectedMembers.filter(id => id !== memberId));
        } else {
            setSelectedMembers([...selectedMembers, memberId]);
        }
    };

    const handleSelectAll = () => {
        setSelectedMembers(teamMembers.map(m => m.id));
    };

    const handleDeselectAll = () => {
        setSelectedMembers([]);
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Team Setup</h2>
                <p className="text-muted-foreground">Manage members and access. Toggle members ON/OFF to control data loading.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Team Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TeamOverview
                            selectedMembers={selectedMembers}
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

'use client';

import { useDashboard } from '../dashboard-context';
import { TeamOverview } from '@/components/dashboard/team-overview';
import { TeamAccessSheet } from '@/components/dashboard/team-access-sheet';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function TeamSetupPage() {
    const { teamMembers, refreshData, selectedMembers } = useDashboard();

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Team Setup</h2>
                    <p className="text-muted-foreground">Manage members and access.</p>
                </div>
                <div>
                    <TeamAccessSheet teamMembers={teamMembers} onUpdate={refreshData} />
                </div>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Team Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TeamOverview selectedMembers={selectedMembers} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

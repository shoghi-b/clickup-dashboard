'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    AlertCircle,
    Clock,
    TrendingUp,
    LogOut,
    Calendar,
    AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function MemberDashboard() {
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<any>(null);
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [resolveForm, setResolveForm] = useState({ reason: '', note: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/member/dashboard');
            const result = await response.json();
            if (result.success) {
                setData(result.data);
            } else {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                }
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolveClick = (discrepancy: any) => {
        setSelectedDiscrepancy(discrepancy);
        setResolveForm({ reason: '', note: '' });
        setResolveDialogOpen(true);
    };

    const handleResolveSubmit = async () => {
        if (!selectedDiscrepancy || !resolveForm.reason) return;

        setSubmitting(true);
        try {
            const response = await fetch('/api/member/resolve-discrepancy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    discrepancyId: selectedDiscrepancy.id,
                    reason: resolveForm.reason,
                    note: resolveForm.note
                })
            });

            if (response.ok) {
                setResolveDialogOpen(false);
                fetchDashboardData(); // Refresh data
            }
        } catch (error) {
            console.error('Failed to resolve:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!data) return null;

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="container mx-auto p-6 max-w-5xl space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Welcome, {data.member.username}</h1>
                        <p className="text-gray-500 mt-1">Here is your weekly digest and action items.</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Weekly Utilization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold">{data.currentWeek.utilization.toFixed(0)}%</span>
                                <span className="text-sm text-gray-500 mb-1">/ 100%</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Based on expected hours</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Hours Logged</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold">{data.currentWeek.totalHours.toFixed(1)}</span>
                                <span className="text-sm text-gray-500 mb-1">hrs</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">This week</p>
                        </CardContent>
                    </Card>

                    <Card className={`border-l-4 shadow-sm hover:shadow-md transition-shadow ${data.openDiscrepancies.length > 0 ? 'border-l-amber-500' : 'border-l-gray-300'}`}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Action Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold">{data.openDiscrepancies.length}</span>
                                <span className="text-sm text-gray-500 mb-1">Pending</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Discrepancies to resolve</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Center: Discrepancies */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        Action Required
                    </h2>

                    {data.openDiscrepancies.length === 0 ? (
                        <Card className="bg-green-50/50 border-green-100">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                                <h3 className="text-lg font-medium text-green-900">All caught up!</h3>
                                <p className="text-green-700 max-w-sm mt-2">
                                    You have no pending discrepancies. Great job keeping your logs accurate.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {data.openDiscrepancies.map((item: any) => (
                                <Card key={item.id} className="border-l-4 border-l-amber-500">
                                    <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                                                    {item.rule.replace('_', ' ')}
                                                </Badge>
                                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(item.date), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                            <p className="font-medium text-gray-900">
                                                {item.rule === 'LOG_AFTER_EXIT' ? 'Logged time after leaving office' :
                                                    item.rule === 'NO_ATTENDANCE' ? 'Logged time but marked absent' :
                                                        item.rule === 'ZERO_PRESENCE' ? 'Zero office hours recorded' : item.rule}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {item.minutesInvolved} minutes flagged
                                            </p>
                                        </div>
                                        <Button onClick={() => handleResolveClick(item)}>
                                            Resolve Issue
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent History / Trend */}
                <div className="space-y-4 pt-4 border-t">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gray-500" />
                        Recent Activity
                    </h2>
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {data.trend.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {data.trend.map((t: any, idx: number) => (
                                            <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
                                                <div className="text-xs text-gray-500 mb-1">
                                                    Week of {format(new Date(t.date), 'MMM dd')}
                                                </div>
                                                <div className={`text-lg font-bold ${t.utilization >= 100 ? 'text-amber-600' :
                                                        t.utilization < 80 ? 'text-red-500' : 'text-green-600'
                                                    }`}>
                                                    {t.utilization.toFixed(0)}%
                                                </div>
                                                <div className="text-xs text-gray-400">Utilization</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No historical data available yet.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Resolve Dialog */}
            <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resolve Discrepancy</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for this discrepancy. This helps improve our records.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Reason</Label>
                            <Select
                                value={resolveForm.reason}
                                onValueChange={(val) => setResolveForm(prev => ({ ...prev, reason: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FORGOT_TO_LOG">Forgot to log time at work</SelectItem>
                                    <SelectItem value="WORKED_FROM_HOME">Worked from home (Approved)</SelectItem>
                                    <SelectItem value="SYSTEM_ISSUE">Technical/System Issue</SelectItem>
                                    <SelectItem value="OTHER">Other / Explanation</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Additional Note (Optional)</Label>
                            <Textarea
                                placeholder="Any specific details..."
                                value={resolveForm.note}
                                onChange={(e) => setResolveForm(prev => ({ ...prev, note: e.target.value }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleResolveSubmit} disabled={!resolveForm.reason || submitting}>
                            {submitting ? 'Submitting...' : 'Mark Resolved'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

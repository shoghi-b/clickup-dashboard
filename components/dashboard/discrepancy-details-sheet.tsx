import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Discrepancy, DiscrepancyRule } from "@/lib/types/discrepancy";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, Clock, Calendar, CheckCircle2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";

interface DiscrepancyDetailsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rule: DiscrepancyRule | null;
    discrepancies: Discrepancy[]; // Should be pre-filtered by the selected rule
    onResolve: (discrepancy: Discrepancy, initialNote?: string) => void;
}

interface TaskDetail {
    id: string;
    taskId: string;
    taskName: string;
    loggedAt: string;
    duration: number;
    projectName: string;
    clickupId: string;
}

export function DiscrepancyDetailsSheet({
    open,
    onOpenChange,
    rule,
    discrepancies,
    onResolve,
}: DiscrepancyDetailsSheetProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [tasks, setTasks] = useState<TaskDetail[]>([]);

    if (!rule) return null;

    const handleExpand = async (discrepancyId: string) => {
        if (expandedId === discrepancyId) {
            setExpandedId(null);
            return;
        }

        setExpandedId(discrepancyId);
        setLoadingTasks(true);
        try {
            const res = await fetch(`/api/discrepancies/details?id=${discrepancyId}`);
            const data = await res.json();
            if (data.success) {
                setTasks(data.tasks);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoadingTasks(false);
        }
    };

    const getRuleTitle = (r: DiscrepancyRule) => {
        switch (r) {
            case 'LOG_AFTER_EXIT': return 'Logged During OUT Periods';
            case 'NO_ATTENDANCE': return 'Logged Without Attendance';
            case 'OUTSIDE_HOURS': return 'After-Hours Logging';
            case 'ZERO_PRESENCE': return 'High Logging, Low Presence';
            default: return 'Discrepancy Details';
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Helper to parse metadata for display
    const getDiscrepancyDetails = (d: Discrepancy) => {
        try {
            const meta = typeof d.metadata === 'string' ? JSON.parse(d.metadata) : d.metadata;

            switch (d.rule) {
                case 'LOG_AFTER_EXIT':
                    return (
                        <div className="text-sm text-gray-600 mt-1">
                            <p>Logged at <span className="font-medium">{meta.logTime}</span> during break ({meta.outPeriodDuring?.start} - {meta.outPeriodDuring?.end})</p>
                            {meta.taskName && <p className="text-xs text-gray-500 italic mt-0.5">Task: {meta.taskName}</p>}
                        </div>
                    );
                case 'NO_ATTENDANCE':
                    return (
                        <div className="text-sm text-gray-600 mt-1">
                            Logged <span className="font-medium">{d.minutesInvolved} mins</span> ({Math.round(d.minutesInvolved / 60)}h {d.minutesInvolved % 60}m) with no attendance.
                        </div>
                    );
                case 'OUTSIDE_HOURS':
                    return (
                        <div className="text-sm text-gray-600 mt-1">
                            Logged <span className="font-medium">{d.minutesInvolved} mins</span> outside working hours (10 AM - 8 PM).
                        </div>
                    );
                case 'ZERO_PRESENCE':
                    return (
                        <div className="text-sm text-gray-600 mt-1">
                            Logged <span className="font-medium">{meta.loggedMinutes}m</span> vs Presence <span className="font-medium">{meta.presenceMinutes}m</span>.
                        </div>
                    );
                default:
                    return <p className="text-sm text-gray-500">View details to resolve.</p>;
            }
        } catch (e) {
            return <p className="text-sm text-gray-500">Metadata unavailable</p>;
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[800px] sm:w-[40vw] flex flex-col h-full bg-white">
                <SheetHeader className="mb-4 pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2 text-xl">
                        <AlertCircle className="w-5 h-5 text-gray-600" />
                        {getRuleTitle(rule)}
                    </SheetTitle>
                    <SheetDescription>
                        Found {discrepancies.length} unresolved instances in the current view.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-4 pb-6">
                        {discrepancies.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                                <p>No open discrepancies of this type!</p>
                            </div>
                        ) : (
                            discrepancies.map((d) => (
                                <div
                                    key={d.id}
                                    className="bg-white rounded-lg border shadow-sm p-5 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border">
                                                {d.teamMember?.profilePicture && (
                                                    <AvatarImage src={d.teamMember.profilePicture} />
                                                )}
                                                <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                                                    {d.teamMember?.username?.substring(0, 2).toUpperCase() || 'TM'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-base leading-none">{d.teamMember?.username || 'Unknown Member'}</p>
                                                <p className="text-xs text-gray-500 mt-1">{d.teamMember?.email || ''}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`${getSeverityColor(d.severity)} capitalize`}>
                                            {d.severity} Priority
                                        </Badge>
                                    </div>

                                    <div className="pl-[3.25rem]">
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                            <div className="flex items-center gap-1.5 align-middle">
                                                <Calendar className="w-4 h-4 mb-0.5" />
                                                {format(new Date(d.date), "EEE, MMM d, yyyy")}
                                            </div>
                                            <div className="flex items-center gap-1.5 align-middle">
                                                <Clock className="w-4 h-4 mb-0.5" />
                                                {Math.round(d.minutesInvolved)} min impact
                                            </div>
                                        </div>

                                        <div className="bg-orange-50 rounded-md p-4 border border-orange-100 mb-4">
                                            {getDiscrepancyDetails(d)}
                                        </div>

                                        <div className="flex justify-between items-center gap-3 mt-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleExpand(d.id)}
                                                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-8 px-3 font-medium transition-colors"
                                            >
                                                {expandedId === d.id ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <ChevronUp className="w-4 h-4" />
                                                        Hide Details
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <ChevronDown className="w-4 h-4" />
                                                        Show Details
                                                    </div>
                                                )}
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onResolve(d)}
                                                className="h-8 border-gray-300 text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                            >
                                                Resolve Entire Issue
                                            </Button>
                                        </div>

                                        {expandedId === d.id && (
                                            <div className="mt-6 pt-4 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                                    Associated Tasks
                                                </h4>
                                                <div className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden max-h-[400px] overflow-y-auto">
                                                    {loadingTasks ? (
                                                        <div className="p-8 text-center text-sm text-gray-500">
                                                            <div className="animate-pulse">Loading tasks...</div>
                                                        </div>
                                                    ) : tasks.length === 0 ? (
                                                        <div className="p-8 text-center text-sm text-gray-500">
                                                            No specific tasks found relating to this discrepancy.
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-gray-200 max-h-[350px] overflow-y-auto">
                                                            {tasks.map(task => (
                                                                <div key={task.id} className="p-3 hover:bg-white transition-colors flex justify-between items-center gap-4 group">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="font-medium text-sm text-gray-900 truncate" title={task.taskName}>
                                                                                {task.taskName}
                                                                            </span>
                                                                            {task.clickupId && (
                                                                                <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-mono bg-gray-200 text-gray-700 group-hover:bg-gray-300 transition-colors">
                                                                                    #{task.clickupId}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 flex items-center gap-3">
                                                                            <span className="flex items-center gap-1">
                                                                                <Clock className="w-3 h-3" />
                                                                                {format(new Date(task.loggedAt), 'h:mm a')}
                                                                            </span>
                                                                            <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                                                                            <span>{Math.round(task.duration / 1000 / 60)}m duration</span>
                                                                            <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                                                                            <span className="truncate max-w-[150px]">{task.projectName}</span>
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-8 text-xs bg-white text-gray-700 border hover:bg-gray-50 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0"
                                                                        onClick={() => onResolve(
                                                                            d,
                                                                            `Task: ${task.taskName} (${task.clickupId || 'No ID'}) - Logged at ${format(new Date(task.loggedAt), 'h:mm a')}`
                                                                        )}
                                                                    >
                                                                        Resolve Task
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

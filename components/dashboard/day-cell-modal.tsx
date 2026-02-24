import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { Play, Square, Home, ClipboardList, AlertTriangle, Loader2, X } from 'lucide-react';

interface DayData {
    clickupHours: number;
    attendanceHours: number;
    attendanceStatus: 'PRESENT' | 'ABSENT' | 'PARTIAL' | null;
    inOutPeriods: { in: string; out: string }[];
    unpairedIns: string[];
    unpairedOuts: string[];
    firstIn: string | null;
    lastOut: string | null;
}

interface DayCellModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dayData: DayData | null;
    memberId: string | null;
    memberName: string;
    date: Date | null;
}

interface TimeEntry {
    id: string;
    taskName: string | null;
    duration: number;
    hours: number;
    startDate: string;
    endDate: string | null;
}

interface List {
    listId: string | null;
    listName: string;
    totalHours: number;
    entryCount: number;
    entries: TimeEntry[];
}

interface Space {
    spaceId: string | null;
    spaceName: string;
    totalHours: number;
    lists: List[];
}

interface ProjectBreakdownData {
    totalHours: number;
    totalEntries: number;
    spaces: Space[];
}

// ── Helpers ──
function fmtHours(hours: number): string {
    if (hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function fmtDelta(delta: number): string {
    if (Math.abs(delta) < 0.017) return '0h'; // < 1 min
    const sign = delta > 0 ? '+' : '−';
    const abs = Math.abs(delta);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    if (h === 0) return `${sign}${m}m`;
    if (m === 0) return `${sign}${h}h`;
    return `${sign}${h}h ${m}m`;
}

// ── Component ──
export function DayCellModal({
    open,
    onOpenChange,
    dayData,
    memberId,
    memberName,
    date
}: DayCellModalProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'clickup'>('overview');

    // ClickUp Data State
    const [clickupLoading, setClickupLoading] = useState(false);
    const [clickupData, setClickupData] = useState<ProjectBreakdownData | null>(null);

    useEffect(() => {
        if (open && activeTab === 'clickup' && memberId && date && !clickupData) {
            fetchProjectBreakdown();
        }
    }, [open, activeTab, memberId, date]);

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setActiveTab('overview');
                setClickupData(null);
            }, 300);
        }
    }, [open]);

    const fetchProjectBreakdown = async () => {
        if (!memberId || !date) return;
        setClickupLoading(true);
        try {
            const params = new URLSearchParams({
                teamMemberId: memberId,
                date: format(date, 'yyyy-MM-dd')
            });
            const response = await fetch(`/api/time-entries/project-breakdown?${params}`);
            const result = await response.json();
            if (result.success) {
                setClickupData(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch project breakdown:', error);
        } finally {
            setClickupLoading(false);
        }
    };

    if (!dayData || !date) return null;

    const cu = dayData.clickupHours;
    const att = dayData.attendanceHours;
    const delta = cu - att;

    // Diagnosis Badge Logic
    const getDiagnosis = () => {
        if (att === 0 && cu === 0) return { status: 'No data', color: 'bg-gray-100 text-gray-500', text: 'Member was absent with no ClickUp entries this day.' };
        if (att === 0 && cu > 0) return { status: 'Remote / logged off-site', color: 'bg-indigo-50 text-indigo-700', text: `No attendance swipe but ${fmtHours(cu)} logged in ClickUp. Likely working remotely.` };
        if (att > 0 && cu === 0) return { status: 'Present — no ClickUp logged', color: 'bg-red-50 text-red-700', text: `Present for ${fmtHours(att)} but no ClickUp entries found. All hours unaccounted.` };

        const ratio = cu / att;
        if (ratio >= 0.8) return { status: 'Healthy', color: 'bg-emerald-50 text-emerald-700', text: `Logged ${fmtHours(cu)} against ${fmtHours(att)} attendance. Good coverage.` };
        if (ratio >= 0.6) return { status: 'Minor gap', color: 'bg-amber-50 text-amber-700', text: `${fmtHours(att - cu)} unlogged — possibly meetings or context-switching not captured.` };
        return { status: 'Logging gap', color: 'bg-red-50 text-red-700', text: `Only ${Math.round(ratio * 100)}% of attendance hours logged. Significant data gap.` };
    };

    const diagnosis = getDiagnosis();
    const utilPct = Math.round((cu / 8) * 100);
    const hasUnpaired = dayData.unpairedIns.length > 0 || dayData.unpairedOuts.length > 0;

    const getDeltaColor = (val: number) => {
        if (val >= -0.1) return 'text-emerald-600'; // Close enough
        if (val >= -2) return 'text-amber-500';
        return 'text-red-500';
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[420px] sm:max-w-[420px] p-0 flex flex-col bg-white border-l shadow-2xl [&>button]:hidden">
                {/* Header */}
                <div className="flex-none pt-5 px-6 pb-0 border-b relative">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute top-5 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="mb-4">
                        <SheetTitle className="text-base font-bold text-slate-900">{memberName}</SheetTitle>
                        <SheetDescription className="text-xs text-slate-500 mt-0.5">{format(date, 'EEEE, MMMM d, yyyy')}</SheetDescription>
                    </div>

                    <div className="flex gap-6 mt-6">
                        {(['overview', 'attendance', 'clickup'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 text-sm font-medium border-b-2 transition-all capitalize -mb-[1px] ${activeTab === tab
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">

                    {/* ── Tab 1: Overview ── */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

                            {/* Split Summary Card */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="flex items-stretch border-b border-slate-100">
                                    <div className="flex-1 p-4 border-r border-slate-100">
                                        <div className="text-[10px] font-bold tracking-wider text-indigo-600 mb-1">CLICKUP</div>
                                        <div className="text-2xl font-bold text-slate-900">{fmtHours(cu)}</div>
                                    </div>
                                    <div className="flex-1 p-4">
                                        <div className="text-[10px] font-bold tracking-wider text-emerald-600 mb-1">ATTENDANCE</div>
                                        <div className="text-2xl font-bold text-slate-900">{fmtHours(att)}</div>
                                        {dayData.firstIn && dayData.lastOut && (
                                            <div className="text-[11px] text-slate-500 mt-1">
                                                {dayData.firstIn} → {dayData.lastOut}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-slate-50/50 px-4 py-3 flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Gap (ClickUp − Attendance)</span>
                                    <span className={`font-bold ${getDeltaColor(delta)}`}>{fmtDelta(delta)}</span>
                                </div>
                            </div>

                            {/* Diagnosis Badge */}
                            <div className={`p-4 rounded-xl shadow-sm border ${diagnosis.color.replace('bg-', 'border-').replace('text-', 'border-').replace('/50', '/20')} ${diagnosis.color}`}>
                                <div className="font-bold text-sm mb-1">{diagnosis.status}</div>
                                <div className="text-xs opacity-90 leading-relaxed">{diagnosis.text}</div>
                            </div>

                            {/* Unpaired Warning */}
                            {hasUnpaired && (
                                <div className="bg-[#fffbeb] border border-[#fde68a] p-4 rounded-xl flex items-start gap-3 shadow-sm">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-900 leading-snug">
                                        <span className="font-semibold block mb-1">Unpaired entries detected</span>
                                        Attendance total may be understated — a check-in or check-out is missing a matching entry. See Attendance tab for details.
                                    </div>
                                </div>
                            )}

                            {/* Quick Tiles */}
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                    <div className="text-xs font-medium text-slate-500 mb-1">Day utilization</div>
                                    <div className={`text-xl font-bold ${utilPct >= 80 ? 'text-emerald-600' : utilPct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                                        {utilPct}%
                                    </div>
                                </div>
                                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                    <div className="text-xs font-medium text-slate-500 mb-1">Hours unaccounted</div>
                                    <div className="text-xl font-bold text-red-500">
                                        {att > cu ? fmtHours(att - cu) : '—'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 2: Attendance ── */}
                    {activeTab === 'attendance' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {att === 0 && !hasUnpaired ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Home className="w-12 h-12 text-slate-200 mb-4" />
                                    <h3 className="text-sm font-semibold text-slate-700 mb-1">No attendance record</h3>
                                    <p className="text-xs text-slate-500 max-w-[200px]">Member was absent or working remotely.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-center grid grid-cols-2 divide-x divide-y divide-slate-100">
                                        <div className="p-4">
                                            <div className="text-[10px] font-bold tracking-wider text-slate-400 mb-1">FIRST IN</div>
                                            <div className="text-xl font-bold text-emerald-600">{dayData.firstIn || '—'}</div>
                                        </div>
                                        <div className="p-4">
                                            <div className="text-[10px] font-bold tracking-wider text-slate-400 mb-1">LAST OUT</div>
                                            <div className="text-xl font-bold text-red-500">{dayData.lastOut || '—'}</div>
                                        </div>
                                        <div className="p-4">
                                            <div className="text-[10px] font-bold tracking-wider text-slate-400 mb-1">HOURS</div>
                                            <div className="text-xl font-bold text-indigo-600">{fmtHours(att)}</div>
                                        </div>
                                        <div className="p-4 flex flex-col justify-center">
                                            <div className="text-[10px] font-bold tracking-wider text-slate-400 mb-1">STATUS</div>
                                            <div className={`text-sm font-bold ${dayData.attendanceStatus === 'PRESENT' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                {dayData.attendanceStatus || 'UNKNOWN'}
                                            </div>
                                        </div>
                                    </div>

                                    {dayData.inOutPeriods.length > 0 && (
                                        <div className="pt-2">
                                            <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                                                <span>🕐</span> Valid Work Sessions ({dayData.inOutPeriods.length})
                                            </h4>
                                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                {dayData.inOutPeriods.map((period, i) => {
                                                    // Very basic duration calc for display if possible, or just the times
                                                    // The spec says "duration right-aligned in indigo", but we only have in/out strings.
                                                    // Let's compute duration if they are HH:mm strings:
                                                    let durStr = '';
                                                    try {
                                                        const [iH, iM] = period.in.split(':').map(Number);
                                                        const [oH, oM] = period.out.split(':').map(Number);
                                                        let mins = (oH * 60 + oM) - (iH * 60 + iM);
                                                        if (mins < 0) mins += 24 * 60; // overnight
                                                        durStr = fmtHours(mins / 60);
                                                    } catch { }

                                                    return (
                                                        <div key={i} className="flex items-center justify-between p-3 text-sm border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                            <div className="flex items-center gap-3 text-slate-600 font-medium">
                                                                <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5 text-emerald-500" /> {period.in}</span>
                                                                <span className="text-slate-300">→</span>
                                                                <span className="flex items-center gap-1.5"><Square className="w-3 h-3 text-red-500" /> {period.out}</span>
                                                            </div>
                                                            {durStr && <span className="text-indigo-600 font-semibold text-xs">{durStr}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {hasUnpaired && (
                                        <div className="pt-2">
                                            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl overflow-hidden shadow-sm">
                                                <div className="px-4 py-3 bg-amber-50 border-b border-[#fde68a]">
                                                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                                                        ⚠️ Unpaired Entries (Missing Match)
                                                    </h4>
                                                </div>
                                                <div className="p-0">
                                                    {dayData.unpairedIns.map((time, i) => (
                                                        <div key={`in-${i}`} className="flex items-center justify-between p-3 text-sm border-b border-[#fde68a]/50 last:border-0">
                                                            <span className="flex items-center gap-2 text-amber-900 font-medium">
                                                                <Play className="w-3.5 h-3.5 text-emerald-500" /> {time}
                                                            </span>
                                                            <span className="text-xs text-amber-600/70 font-medium">(No matching OUT)</span>
                                                        </div>
                                                    ))}
                                                    {dayData.unpairedOuts.map((time, i) => (
                                                        <div key={`out-${i}`} className="flex items-center justify-between p-3 text-sm border-b border-[#fde68a]/50 last:border-0">
                                                            <span className="flex items-center gap-2 text-amber-900 font-medium">
                                                                <Square className="w-3 h-3 text-red-500" /> {time}
                                                            </span>
                                                            <span className="text-xs text-amber-600/70 font-medium">(No matching IN)</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ── Tab 3: ClickUp ── */}
                    {activeTab === 'clickup' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {clickupLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                    <p className="text-sm font-medium">Loading time entries...</p>
                                </div>
                            ) : cu === 0 || !clickupData || clickupData?.spaces?.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <ClipboardList className="w-12 h-12 text-slate-200 mb-4" />
                                    <h3 className="text-sm font-semibold text-slate-700 mb-1">No ClickUp entries</h3>
                                    <p className="text-xs text-slate-500 max-w-[200px]">No time was logged in ClickUp for this day.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex divide-x divide-slate-100">
                                        <div className="flex-1 p-4 text-center">
                                            <div className="text-[10px] font-bold tracking-wider text-slate-400 mb-1">TOTAL HOURS</div>
                                            <div className="text-2xl font-bold text-indigo-600">{fmtHours(clickupData.totalHours)}</div>
                                        </div>
                                        <div className="flex-1 p-4 text-center">
                                            <div className="text-[10px] font-bold tracking-wider text-slate-400 mb-1">TOTAL ENTRIES</div>
                                            <div className="text-2xl font-bold text-slate-900">{clickupData.totalEntries}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        {clickupData.spaces.map((space: Space) => (
                                            <div key={space.spaceId || space.spaceName} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-900">{space.spaceName}</span>
                                                        <span className="text-[10px] font-medium text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">
                                                            {space.lists.reduce((acc: number, l: List) => acc + l.entryCount, 0)} entries
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-bold text-indigo-600">{fmtHours(space.totalHours)}</span>
                                                </div>

                                                <div className="p-0">
                                                    {space.lists.map((list: List, lIdx: number) => (
                                                        <div key={list.listId || lIdx} className="border-b border-slate-100 last:border-0">
                                                            <div className="px-4 py-2 bg-slate-50/30">
                                                                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{list.listName}</span>
                                                            </div>
                                                            <div className="divide-y divide-slate-50">
                                                                {list.entries.map((entry: TimeEntry) => (
                                                                    <div key={entry.id} className="flex justify-between items-start px-4 py-2.5 hover:bg-slate-50 transition-colors">
                                                                        <span className="text-[11px] text-slate-600 font-medium leading-relaxed pr-4 line-clamp-2">
                                                                            {entry.taskName || 'Untitled Task'}
                                                                        </span>
                                                                        <span className="text-[11px] text-slate-900 font-semibold whitespace-nowrap mt-0.5">
                                                                            {fmtHours(entry.hours)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                </div>
            </SheetContent>
        </Sheet>
    );
}

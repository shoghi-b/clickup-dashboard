import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfWeek, endOfWeek } from 'date-fns';

interface DashboardStats {
    totalTeamMembers: number;
    complianceRate: number;
    avgUtilization: number;
    totalHours: number;
}

interface TeamMember {
    id: string;
    username: string;
    email: string | null;
    profilePicture: string | null;
    hasPassword: boolean;
}

interface DashboardContextType {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    viewMode: 'week' | 'month';
    setViewMode: (mode: 'week' | 'month') => void;

    // MASTER visibility list — set once in Team Setup, persists to localStorage.
    // Controls which members appear across ALL views in the app.
    visibleMembers: string[];
    setVisibleMembers: (members: string[] | ((prev: string[]) => string[])) => void;

    // PER-VIEW filter — within visibleMembers, which to show data for right now.
    // Defaults to all visibleMembers. Persists to localStorage per session.
    selectedMembers: string[];
    setSelectedMembers: (members: string[] | ((prev: string[]) => string[])) => void;

    teamMembers: TeamMember[];
    stats: DashboardStats;
    weeklyKPIData: any;
    refreshData: () => Promise<void>;
    isLoading: boolean;
}

const MASTER_VISIBLE_KEY = 'master_visible_members';
const PER_VIEW_SELECTED_KEY = 'manager_selected_members';

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    });
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

    // ── Master visibility (localStorage) ─────────────────────────────────────
    const [visibleMembers, setVisibleMembersState] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(MASTER_VISIBLE_KEY);
            if (saved) {
                try { return JSON.parse(saved); } catch { /* ignore */ }
            }
        }
        return [];
    });

    const setVisibleMembers = (
        value: string[] | ((prev: string[]) => string[])
    ) => {
        setVisibleMembersState((prev) => {
            const next = typeof value === 'function' ? value(prev) : value;
            if (typeof window !== 'undefined') {
                localStorage.setItem(MASTER_VISIBLE_KEY, JSON.stringify(next));
            }
            return next;
        });
    };

    // ── Per-view selected filter (localStorage) ────────────────────────────
    const [selectedMembers, setSelectedMembersState] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(PER_VIEW_SELECTED_KEY);
            if (saved) {
                try { return JSON.parse(saved); } catch { /* ignore */ }
            }
        }
        return [];
    });

    const setSelectedMembers = (
        value: string[] | ((prev: string[]) => string[])
    ) => {
        setSelectedMembersState((prev) => {
            const next = typeof value === 'function' ? value(prev) : value;
            if (typeof window !== 'undefined') {
                localStorage.setItem(PER_VIEW_SELECTED_KEY, JSON.stringify(next));
            }
            return next;
        });
    };

    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        totalTeamMembers: 0,
        complianceRate: 0,
        avgUtilization: 0,
        totalHours: 0,
    });
    const [weeklyKPIData, setWeeklyKPIData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Initial load
    useEffect(() => {
        refreshData();
    }, []);

    // ── Keep selectedMembers ⊆ visibleMembers ─────────────────────────────
    // Whenever the master visible list changes (e.g. a member is hidden in
    // Team Setup), automatically remove them from the per-view selection too.
    useEffect(() => {
        if (visibleMembers.length === 0) return; // not yet loaded
        setSelectedMembersState((prev) => {
            const pruned = prev.filter(id => visibleMembers.includes(id));
            // Only update if something actually changed
            if (pruned.length === prev.length) return prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem(PER_VIEW_SELECTED_KEY, JSON.stringify(pruned));
            }
            return pruned;
        });
    }, [visibleMembers]);

    // Refresh stats when date range or selected members change
    useEffect(() => {
        if (dateRange?.from && dateRange?.to) {
            fetchStats();
            if (viewMode === 'week') {
                fetchWeeklyKPI();
            }
        }
    }, [dateRange, selectedMembers]);

    const fetchStats = async () => {
        if (!dateRange?.from || !dateRange?.to) return;
        try {
            const params = new URLSearchParams({
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to.toISOString(),
            });
            const response = await fetch(`/api/analytics/stats?${params}`);
            const result = await response.json();
            if (result.success) {
                setStats(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchWeeklyKPI = async () => {
        if (!dateRange?.from) return;
        try {
            const params = new URLSearchParams({
                date: dateRange.from.toISOString(),
                memberIds: selectedMembers.join(','),
            });
            const response = await fetch(`/api/weekly-kpi?${params}`);
            const result = await response.json();
            if (result.success) {
                setWeeklyKPIData(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch weekly KPI:', error);
        }
    };

    const fetchTeamMembers = async () => {
        try {
            const response = await fetch('/api/team-members');
            const result = await response.json();
            if (result.success) {
                const allIds: string[] = result.data.map((m: TeamMember) => m.id);
                setTeamMembers(result.data);

                // Bootstrap visibleMembers: if no master list is saved yet, default to ALL members.
                const savedVisible = typeof window !== 'undefined'
                    ? localStorage.getItem(MASTER_VISIBLE_KEY)
                    : null;
                if (!savedVisible) {
                    setVisibleMembers(allIds);
                }

                // Bootstrap selectedMembers: always intersect with visibleMembers
                // so that stale localStorage values (e.g. from before this feature)
                // never include hidden members.
                const savedSelected = typeof window !== 'undefined'
                    ? localStorage.getItem(PER_VIEW_SELECTED_KEY)
                    : null;
                const effectiveVisible: string[] = savedVisible ? JSON.parse(savedVisible) : allIds;
                if (savedSelected) {
                    try {
                        const parsed: string[] = JSON.parse(savedSelected);
                        const pruned = parsed.filter(id => effectiveVisible.includes(id));
                        // Persist the pruned value if it changed
                        if (pruned.length !== parsed.length) {
                            localStorage.setItem(PER_VIEW_SELECTED_KEY, JSON.stringify(pruned));
                            setSelectedMembersState(pruned);
                        }
                    } catch { /* ignore parse error, leave state as-is */ }
                } else {
                    // No saved selection at all — seed from visible members
                    setSelectedMembers(effectiveVisible);
                }
            }
        } catch (error) {
            console.error('Failed to fetch team members:', error);
        }
    };

    const refreshData = async () => {
        setIsLoading(true);
        await Promise.all([fetchTeamMembers(), fetchStats(), fetchWeeklyKPI()]);
        setIsLoading(false);
    };

    return (
        <DashboardContext.Provider
            value={{
                dateRange,
                setDateRange,
                viewMode,
                setViewMode,
                visibleMembers,
                setVisibleMembers,
                selectedMembers,
                setSelectedMembers,
                teamMembers,
                stats,
                weeklyKPIData,
                refreshData,
                isLoading,
            }}
        >
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}

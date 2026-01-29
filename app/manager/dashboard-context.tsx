import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

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
    selectedMembers: string[];
    setSelectedMembers: (members: string[] | ((prev: string[]) => string[])) => void;
    teamMembers: TeamMember[];
    stats: DashboardStats;
    refreshData: () => Promise<void>;
    isLoading: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    });
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
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

    // Refresh stats when date range changes
    useEffect(() => {
        if (dateRange?.from && dateRange?.to) {
            fetchStats();
            // Fetch KPI if not in "team" view (though viewMode logic is handled in components usually)
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
                setTeamMembers(result.data);
                if (selectedMembers.length === 0) {
                    setSelectedMembers(result.data.map((m: TeamMember) => m.id));
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

// Update Interface
interface DashboardContextType {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    viewMode: 'week' | 'month';
    setViewMode: (mode: 'week' | 'month') => void;
    selectedMembers: string[];
    setSelectedMembers: (members: string[] | ((prev: string[]) => string[])) => void;
    teamMembers: TeamMember[];
    stats: DashboardStats;
    weeklyKPIData: any;
    refreshData: () => Promise<void>;
    isLoading: boolean;
}


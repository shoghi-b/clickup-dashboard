'use client';

import { useState, useEffect } from 'react';
import { useDashboard } from '../dashboard-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ResetDataButton } from '@/components/dashboard/reset-data-button';
import { RefreshCw, Upload, FileSpreadsheet, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { CustomDateRangePicker, DateRange } from '@/components/ui/custom-date-range-picker';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function DataManagementPage() {
    const { refreshData } = useDashboard();

    const today = new Date();
    const defaultRange: DateRange = { from: today, to: today };
    const defaultMonthRange: DateRange = { from: startOfMonth(today), to: endOfMonth(today) };

    // Helper function to safely read boolean from localStorage
    const getStoredBoolean = (key: string, defaultValue: boolean = false): boolean => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const stored = localStorage.getItem(key);
            return stored !== null ? stored === 'true' : defaultValue;
        } catch {
            return defaultValue;
        }
    };

    // Sync State
    const [syncing, setSyncing] = useState(false);
    const [lastSyncClickUp, setLastSyncClickUp] = useState<Date | null>(null);
    const [syncDateRange, setSyncDateRange] = useState<DateRange | undefined>(defaultRange);

    // Attendance Upload State
    const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
    const [attendanceDateRange, setAttendanceDateRange] = useState<DateRange | undefined>(defaultMonthRange);
    const [uploadingAttendance, setUploadingAttendance] = useState(false);
    const [uploadResult, setUploadResult] = useState<{
        success: boolean;
        message: string;
        summary?: any;
    } | null>(null);

    // Attendance Device Sync State
    const [deviceSyncDate, setDeviceSyncDate] = useState<DateRange | undefined>(defaultRange);
    const [syncingDevice, setSyncingDevice] = useState(false);
    const [lastSyncAttendance, setLastSyncAttendance] = useState<Date | null>(null);

    // Auto-sync State - Will be initialized from localStorage in useEffect
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
    const [nextAutoSync, setNextAutoSync] = useState<Date | null>(null);
    const [autoSyncClickUpEnabled, setAutoSyncClickUpEnabled] = useState(false);
    const [nextAutoSyncClickUp, setNextAutoSyncClickUp] = useState<Date | null>(null);

    // Track if we've initialized from localStorage to prevent race condition
    const [initialized, setInitialized] = useState(false);

    // Persist auto-sync toggle states to localStorage (only after initialization)
    useEffect(() => {
        if (initialized && typeof window !== 'undefined') {
            localStorage.setItem('attendance-auto-sync-enabled', String(autoSyncEnabled));
        }
    }, [autoSyncEnabled, initialized]);

    useEffect(() => {
        if (initialized && typeof window !== 'undefined') {
            localStorage.setItem('clickup-auto-sync-enabled', String(autoSyncClickUpEnabled));
        }
    }, [autoSyncClickUpEnabled, initialized]);

    // Initialize toggle states from localStorage after component mounts
    useEffect(() => {
        const attendanceEnabled = getStoredBoolean('attendance-auto-sync-enabled');
        const clickupEnabled = getStoredBoolean('clickup-auto-sync-enabled');

        setAutoSyncEnabled(attendanceEnabled);
        setAutoSyncClickUpEnabled(clickupEnabled);
        setInitialized(true);
    }, []);

    // Handlers
    const handleClickUpSync = async () => {
        if (!syncDateRange?.from || !syncDateRange?.to) {
            alert('Please select a date range');
            return;
        }
        setSyncing(true);
        try {
            // Sync team members first
            const teamResponse = await fetch('/api/sync/team-members', { method: 'POST' });
            const teamResult = await teamResponse.json();
            if (!teamResult.success) throw new Error(teamResult.error);

            // Sync time entries
            const timeResponse = await fetch('/api/sync/time-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: syncDateRange.from.toISOString(),
                    endDate: syncDateRange.to.toISOString(),
                }),
            });
            const timeResult = await timeResponse.json();
            if (!timeResult.success) throw new Error(timeResult.error);

            if (timeResult.lastSync) {
                setLastSyncClickUp(new Date(timeResult.lastSync));
            }
            await refreshData();
            alert(`Sync successful! Processed ${timeResult.count} entries.`);
        } catch (error) {
            alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSyncing(false);
        }
    };

    const handleAttendanceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttendanceFile(file);
            setUploadResult(null);
        }
    };

    const handleAttendanceUpload = async () => {
        if (!attendanceFile || !attendanceDateRange?.from || !attendanceDateRange?.to) return;

        setUploadingAttendance(true);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append('file', attendanceFile);
            formData.append('startDate', attendanceDateRange.from.toISOString());
            formData.append('endDate', attendanceDateRange.to.toISOString());

            const response = await fetch('/api/attendance/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (response.ok && result.success) {
                setUploadResult({
                    success: true,
                    message: 'Attendance data uploaded successfully!',
                    summary: result.summary
                });
                setAttendanceFile(null);
                const fileInput = document.getElementById('attendance-file-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                await refreshData();
            } else {
                setUploadResult({
                    success: false,
                    message: result.error || 'Failed to upload'
                });
            }
        } catch (error) {
            setUploadResult({
                success: false,
                message: 'An error occurred during upload'
            });
        } finally {
            setUploadingAttendance(false);
        }
    };

    const handleDeviceSync = async () => {
        if (!deviceSyncDate?.from || !deviceSyncDate?.to) {
            alert('Please select a date range');
            return;
        }

        setSyncingDevice(true);
        try {
            const response = await fetch('/api/attendance/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: deviceSyncDate.from.toISOString(),
                    endDate: deviceSyncDate.to.toISOString(),
                }),
            });

            const result = await response.json();
            if (response.ok && result.success) {
                if (result.lastSync) {
                    setLastSyncAttendance(new Date(result.lastSync));
                }
                alert(`Attendance sync successful! Processed ${result.count} records.`);
                await refreshData();
            } else {
                alert(`Sync failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert('An error occurred while syncing attendance');
        } finally {
            setSyncingDevice(false);
        }
    };

    // Fetch initial sync timestamps
    useEffect(() => {
        const fetchSyncStatus = async () => {
            try {
                const response = await fetch('/api/sync/status');
                const result = await response.json();

                if (result.success) {
                    if (result.lastSyncClickUp) {
                        setLastSyncClickUp(new Date(result.lastSyncClickUp));
                    }
                    if (result.lastSyncAttendance) {
                        setLastSyncAttendance(new Date(result.lastSyncAttendance));
                    }
                }
            } catch (error) {
                console.error('Error fetching sync status:', error);
            }
        };

        fetchSyncStatus();
    }, []);

    // Auto-sync functionality
    useEffect(() => {
        if (!autoSyncEnabled) {
            setNextAutoSync(null);
            return;
        }

        // Set next sync time
        const nextSync = new Date();
        nextSync.setHours(nextSync.getHours() + 1);
        setNextAutoSync(nextSync);

        // Auto-sync interval - runs every hour
        const interval = setInterval(async () => {
            console.log('Auto-sync: Fetching attendance data for today...');

            const today = new Date();
            const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

            try {
                const response = await fetch('/api/attendance/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        startDate: startOfToday.toISOString(),
                        endDate: endOfToday.toISOString(),
                    }),
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    if (result.lastSync) {
                        setLastSyncAttendance(new Date(result.lastSync));
                    }
                    console.log(`Auto-sync successful: ${result.count} records synced`);
                    await refreshData();
                }

                // Update next sync time
                const nextSync = new Date();
                nextSync.setHours(nextSync.getHours() + 1);
                setNextAutoSync(nextSync);
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }, 60 * 60 * 1000); // 1 hour in milliseconds

        // Cleanup interval on unmount or when auto-sync is disabled
        return () => clearInterval(interval);
    }, [autoSyncEnabled, refreshData]);

    // ClickUp Auto-sync functionality
    useEffect(() => {
        if (!autoSyncClickUpEnabled) {
            setNextAutoSyncClickUp(null);
            return;
        }

        // Set next sync time
        const nextSync = new Date();
        nextSync.setHours(nextSync.getHours() + 1);
        setNextAutoSyncClickUp(nextSync);

        // Auto-sync interval - runs every hour
        const interval = setInterval(async () => {
            console.log('Auto-sync ClickUp: Fetching data for today and last 2 days...');

            const today = new Date();
            const twoDaysAgo = new Date(today);
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            try {
                // Sync team members first
                const teamResponse = await fetch('/api/sync/team-members', { method: 'POST' });
                const teamResult = await teamResponse.json();

                if (teamResult.success) {
                    // Sync time entries
                    const timeResponse = await fetch('/api/sync/time-entries', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            startDate: twoDaysAgo.toISOString(),
                            endDate: today.toISOString(),
                        }),
                    });

                    const timeResult = await timeResponse.json();
                    if (timeResult.success) {
                        if (timeResult.lastSync) {
                            setLastSyncClickUp(new Date(timeResult.lastSync));
                        }
                        console.log(`Auto-sync ClickUp successful: ${timeResult.count} entries synced`);
                        await refreshData();
                    }
                }

                // Update next sync time
                const nextSync = new Date();
                nextSync.setHours(nextSync.getHours() + 1);
                setNextAutoSyncClickUp(nextSync);
            } catch (error) {
                console.error('Auto-sync ClickUp failed:', error);
            }
        }, 60 * 60 * 1000); // 1 hour in milliseconds

        // Cleanup interval on unmount or when auto-sync is disabled
        return () => clearInterval(interval);
    }, [autoSyncClickUpEnabled, refreshData]);

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Data Management</h2>
                <p className="text-muted-foreground">Sync data, upload attendance, and manage system.</p>
            </div>

            {/* Row 1: ClickUp Sync (Full Width) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-blue-600" />
                        ClickUp Data Sync
                    </CardTitle>
                    <CardDescription>Fetch latest time entries and tasks from ClickUp.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="space-y-0.5">
                            <Label htmlFor="auto-sync-clickup" className="font-medium">Auto-Sync (Hourly)</Label>
                            <p className="text-xs text-muted-foreground">
                                Automatically fetch time entries for today and last 2 days
                            </p>
                        </div>
                        <Switch
                            id="auto-sync-clickup"
                            checked={autoSyncClickUpEnabled}
                            onCheckedChange={setAutoSyncClickUpEnabled}
                        />
                    </div>

                    {autoSyncClickUpEnabled && nextAutoSyncClickUp && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 px-3">
                            <Clock className="w-3 h-3" /> Next auto-sync: {format(nextAutoSyncClickUp, 'HH:mm')}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Select Date Range</Label>
                        <CustomDateRangePicker
                            value={syncDateRange || defaultRange}
                            onChange={setSyncDateRange}
                        />
                    </div>
                    <Button
                        onClick={handleClickUpSync}
                        disabled={syncing || !syncDateRange?.from}
                        className="w-full"
                    >
                        {syncing ? 'Syncing...' : 'Sync ClickUp Data'}
                    </Button>
                    {lastSyncClickUp && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Last sync: {format(lastSyncClickUp, 'MMM dd, HH:mm')}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Row 2: Attendance Operations (Side by Side) */}
            <div className="grid gap-6 md:grid-cols-2">

                {/* Attendance Device Sync Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-green-600" />
                            Attendance Device Sync
                        </CardTitle>
                        <CardDescription>Fetch punch logs directly from the biometric device API.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <div className="space-y-0.5">
                                <Label htmlFor="auto-sync" className="font-medium">Auto-Sync (Hourly)</Label>
                                <p className="text-xs text-muted-foreground">
                                    Automatically fetch today's attendance data every hour
                                </p>
                            </div>
                            <Switch
                                id="auto-sync"
                                checked={autoSyncEnabled}
                                onCheckedChange={setAutoSyncEnabled}
                            />
                        </div>

                        {autoSyncEnabled && nextAutoSync && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 px-3">
                                <Clock className="w-3 h-3" /> Next auto-sync: {format(nextAutoSync, 'HH:mm')}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Select Date Range</Label>
                            <CustomDateRangePicker
                                value={deviceSyncDate || defaultRange}
                                onChange={setDeviceSyncDate}
                            />
                        </div>
                        <Button
                            onClick={handleDeviceSync}
                            disabled={syncingDevice || !deviceSyncDate?.from}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            {syncingDevice ? 'Syncing...' : 'Sync From Device'}
                        </Button>

                        {lastSyncAttendance && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Last sync: {format(lastSyncAttendance, 'MMM dd, HH:mm')}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Upload Attendance File Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5 text-purple-600" />
                            Upload Attendance File
                        </CardTitle>
                        <CardDescription>Upload XLS/XLSX export from the attendance machine.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Attendance File</Label>
                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 hover:border-gray-400 transition-colors">
                                <input
                                    id="attendance-file-input"
                                    type="file"
                                    accept=".xls,.xlsx"
                                    onChange={handleAttendanceFileChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="attendance-file-input"
                                    className="flex flex-col items-center justify-center cursor-pointer"
                                >
                                    <FileSpreadsheet className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm font-medium">
                                        {attendanceFile ? attendanceFile.name : 'Click to upload'}
                                    </span>
                                </label>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Date Range to Process</Label>
                            <CustomDateRangePicker
                                value={attendanceDateRange || defaultMonthRange}
                                onChange={setAttendanceDateRange}
                            />
                        </div>
                        <Button
                            onClick={handleAttendanceUpload}
                            disabled={!attendanceFile || uploadingAttendance}
                            className="w-full"
                        >
                            {uploadingAttendance ? 'Uploading...' : 'Upload & Process'}
                        </Button>

                        {/* Results */}
                        {uploadResult && (
                            <div className={`rounded-lg p-4 border ${uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-start gap-3">
                                    {uploadResult.success ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                                    <div>
                                        <p className={`text-sm font-medium ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                                            {uploadResult.message}
                                        </p>
                                        {uploadResult.summary && (
                                            <div className="mt-2 text-xs text-green-800 space-y-1">
                                                <p>Records: {uploadResult.summary.totalRecords}</p>
                                                <p>Present: {uploadResult.summary.presentCount}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Danger Zone (Full Width) */}
            <Card className="border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle className="text-red-700">Danger Zone</CardTitle>
                    <CardDescription className="text-red-600">Irreversible actions. Proceed with caution.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResetDataButton />
                </CardContent>
            </Card>
        </div>
    );
}

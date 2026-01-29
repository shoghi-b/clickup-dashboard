'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardProvider } from './dashboard-context';

export default function ManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardProvider>
            <div className="flex h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </DashboardProvider>
    );
}

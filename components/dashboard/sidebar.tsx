'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, FileText, Users, Database, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
    {
        title: 'Overview',
        href: '/manager/overview',
        icon: LayoutDashboard,
    },
    {
        title: 'Weekly Logs',
        href: '/manager/weekly',
        icon: Calendar,
    },
    {
        title: 'Monthly Summary',
        href: '/manager/monthly',
        icon: FileText,
    },
    {
        title: 'Team Setup',
        href: '/manager/team',
        icon: Users,
    },
    {
        title: 'Data Management',
        href: '/manager/data',
        icon: Database,
    },
];

export function Sidebar() {
    const pathname = usePathname();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="flex flex-col h-screen w-64 bg-white border-r">
            <div className="p-6 border-b">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    SuperAdmin
                </h1>
                <p className="text-xs text-gray-500 mt-1">Attendance Dashboard</p>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                className={cn(
                                    'w-full justify-start mb-1',
                                    isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                )}
                            >
                                <item.icon className={cn('w-4 h-4 mr-2', isActive ? 'text-blue-600' : 'text-gray-500')} />
                                {item.title}
                            </Button>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                </Button>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, FileText, Users, Database, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className={cn(
            'flex flex-col h-screen bg-white border-r transition-all duration-300',
            isCollapsed ? 'w-16' : 'w-64'
        )}>
            <div className="p-6 border-b flex items-center justify-between">
                {!isCollapsed && (
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            SuperAdmin
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">Attendance Dashboard</p>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn('h-8 w-8', isCollapsed && 'mx-auto')}
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                className={cn(
                                    'w-full mb-1',
                                    isCollapsed ? 'justify-center px-2' : 'justify-start',
                                    isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                )}
                                title={isCollapsed ? item.title : undefined}
                            >
                                <item.icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-gray-500', !isCollapsed && 'mr-2')} />
                                {!isCollapsed && item.title}
                            </Button>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t">
                <Button
                    variant="ghost"
                    className={cn(
                        'w-full text-red-600 hover:text-red-700 hover:bg-red-50',
                        isCollapsed ? 'justify-center px-2' : 'justify-start'
                    )}
                    onClick={handleLogout}
                    title={isCollapsed ? 'Logout' : undefined}
                >
                    <LogOut className={cn('h-4 w-4', !isCollapsed && 'mr-2')} />
                    {!isCollapsed && 'Logout'}
                </Button>
            </div>
        </div>
    );
}

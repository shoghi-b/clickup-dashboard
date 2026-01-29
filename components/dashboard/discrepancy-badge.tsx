'use client';

import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DiscrepancySeverity } from '@/lib/types/discrepancy';

interface DiscrepancyBadgeProps {
    count: number;
    severity: DiscrepancySeverity;
    isResolved?: boolean;
    rule?: string;
    onClick?: () => void;
}

export function DiscrepancyBadge({
    count,
    severity,
    isResolved = false,
    rule,
    onClick
}: DiscrepancyBadgeProps) {
    if (count === 0) return null;

    const getSeverityStyles = () => {
        if (isResolved) {
            return {
                bg: 'bg-green-100',
                text: 'text-green-700',
                border: 'border-green-300',
                icon: CheckCircle2
            };
        }

        switch (severity) {
            case 'high':
                return {
                    bg: 'bg-red-100',
                    text: 'text-red-700',
                    border: 'border-red-300',
                    icon: AlertCircle
                };
            case 'medium':
                return {
                    bg: 'bg-yellow-100',
                    text: 'text-yellow-700',
                    border: 'border-yellow-300',
                    icon: AlertTriangle
                };
            case 'low':
                return {
                    bg: 'bg-blue-100',
                    text: 'text-blue-700',
                    border: 'border-blue-300',
                    icon: AlertCircle
                };
            default:
                return {
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    border: 'border-gray-300',
                    icon: AlertCircle
                };
        }
    };

    const styles = getSeverityStyles();
    const Icon = styles.icon;

    const getRuleLabel = () => {
        if (!rule) return isResolved ? 'Resolved' : 'Issue';

        const labels: Record<string, string> = {
            'LOG_AFTER_EXIT': 'OUT Period',
            'NO_ATTENDANCE': 'No Attendance',
            'OUTSIDE_HOURS': 'After Hours',
            'ZERO_PRESENCE': 'Low Presence'
        };

        return labels[rule] || rule;
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full 
              text-xs font-medium border 
              ${styles.bg} ${styles.text} ${styles.border}
              hover:opacity-80 transition-opacity
              ${onClick ? 'cursor-pointer' : 'cursor-default'}
            `}
                    >
                        <Icon className="w-3 h-3" />
                        <span>{count}</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-medium">
                        {count} {getRuleLabel()} {count === 1 ? 'discrepancy' : 'discrepancies'}
                    </p>
                    {isResolved ? (
                        <p className="text-xs text-gray-500 mt-1">Click to view resolution</p>
                    ) : (
                        <p className="text-xs text-gray-500 mt-1">Click to resolve</p>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TrendIndicator as TrendIndicatorType } from '@/lib/types/report';

interface TrendIndicatorProps {
    trend: TrendIndicatorType;
    compact?: boolean;
}

export function TrendIndicator({ trend, compact = false }: TrendIndicatorProps) {
    const getColor = () => {
        switch (trend.direction) {
            case 'improving':
                return 'text-green-600 border-green-600';
            case 'declining':
                return 'text-red-600 border-red-600';
            default:
                return 'text-gray-600 border-gray-600';
        }
    };

    const getIcon = () => {
        switch (trend.direction) {
            case 'improving':
                return <ArrowDown className="h-3 w-3" />;
            case 'declining':
                return <ArrowUp className="h-3 w-3" />;
            default:
                return <Minus className="h-3 w-3" />;
        }
    };

    const getLabel = () => {
        if (trend.direction === 'stable') return 'Stable';
        const absChange = Math.abs(trend.percentageChange).toFixed(0);
        return `${absChange}%`;
    };

    if (compact) {
        return (
            <div className={`flex items-center gap-1 ${getColor()}`}>
                {getIcon()}
                <span className="text-xs font-medium">{getLabel()}</span>
            </div>
        );
    }

    return (
        <Badge variant="outline" className={`${getColor()} gap-1`}>
            {getIcon()}
            <span>{getLabel()}</span>
        </Badge>
    );
}

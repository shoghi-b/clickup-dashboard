'use client';

import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface TrendSparklineProps {
    data: number[];
    color?: string;
}

export function TrendSparkline({ data, color = '#3b82f6' }: TrendSparklineProps) {
    const chartData = data.map((value, index) => ({ value, index }));

    return (
        <ResponsiveContainer width="100%" height={40}>
            <LineChart data={chartData}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

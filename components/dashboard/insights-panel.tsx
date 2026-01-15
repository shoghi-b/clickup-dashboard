'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

interface Insight {
  id: string;
  scope: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  metrics: any;
  suggestedActions: string[];
  acknowledged: boolean;
}

interface InsightsPanelProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function InsightsPanel({ dateRange }: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  useEffect(() => {
    fetchInsights();
  }, [dateRange]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periodType: 'WEEKLY',
        date: dateRange.from.toISOString(),
      });
      const response = await fetch(`/api/kpi/insights?${params}`);
      const result = await response.json();

      if (result.success) {
        setInsights(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeInsight = async (insightId: string) => {
    try {
      const response = await fetch('/api/kpi/insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, acknowledgedBy: 'User' }),
      });

      if (response.ok) {
        setInsights(insights.map(i => 
          i.id === insightId ? { ...i, acknowledged: true } : i
        ));
      }
    } catch (error) {
      console.error('Failed to acknowledge insight:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'INFO':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ACCOUNTABILITY':
        return 'bg-purple-100 text-purple-800';
      case 'CAPACITY':
        return 'bg-blue-100 text-blue-800';
      case 'RISK':
        return 'bg-orange-100 text-orange-800';
      case 'GENERAL':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInsights = insights.filter(insight => {
    if (filter === 'ALL') return !insight.acknowledged;
    return insight.severity === filter && !insight.acknowledged;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Loading insights...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Insights & Recommendations</CardTitle>
            <CardDescription>AI-generated insights from your team's KPIs</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('ALL')}
            >
              All
            </Button>
            <Button
              variant={filter === 'CRITICAL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('CRITICAL')}
            >
              Critical
            </Button>
            <Button
              variant={filter === 'WARNING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('WARNING')}
            >
              Warning
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredInsights.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <p className="text-lg font-medium">No active insights</p>
            <p className="text-sm text-gray-500">Your team metrics look good!</p>
          </div>
        ) : (
          filteredInsights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border-2 ${getSeverityColor(insight.severity)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(insight.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <Badge variant="outline" className={getCategoryColor(insight.category)}>
                        {insight.category}
                      </Badge>
                    </div>
                    <p className="text-sm mb-3">{insight.description}</p>
                    {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold mb-2">Suggested Actions:</p>
                        <ul className="text-xs space-y-1">
                          {insight.suggestedActions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => acknowledgeInsight(insight.id)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}


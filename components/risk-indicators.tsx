import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, TrendingUp, Clock } from 'lucide-react';

interface RiskIndicatorsProps {
  hasUnderLogging?: boolean;
  hasOverwork?: boolean;
  hasExcessiveBackfill?: boolean;
}

export function RiskIndicators({
  hasUnderLogging,
  hasOverwork,
  hasExcessiveBackfill,
}: RiskIndicatorsProps) {
  const risks = [];

  if (hasUnderLogging) {
    risks.push({
      icon: TrendingDown,
      label: 'Under-logging',
      className: 'bg-orange-100 text-orange-800',
    });
  }

  if (hasOverwork) {
    risks.push({
      icon: TrendingUp,
      label: 'Overwork',
      className: 'bg-red-100 text-red-800',
    });
  }

  if (hasExcessiveBackfill) {
    risks.push({
      icon: Clock,
      label: 'Excessive Backfill',
      className: 'bg-yellow-100 text-yellow-800',
    });
  }

  if (risks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {risks.map((risk, index) => {
        const Icon = risk.icon;
        return (
          <Badge key={index} className={risk.className}>
            <Icon className="w-3 h-3 mr-1" />
            {risk.label}
          </Badge>
        );
      })}
    </div>
  );
}


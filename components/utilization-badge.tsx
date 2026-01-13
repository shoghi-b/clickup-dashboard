import { Badge } from '@/components/ui/badge';

type UtilizationCategory = 'UNDER' | 'HEALTHY' | 'OVER';

interface UtilizationBadgeProps {
  category: UtilizationCategory;
  percentage: number;
}

export function UtilizationBadge({ category, percentage }: UtilizationBadgeProps) {
  const variants: Record<UtilizationCategory, { className: string }> = {
    UNDER: {
      className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    },
    HEALTHY: {
      className: 'bg-green-100 text-green-800 hover:bg-green-100',
    },
    OVER: {
      className: 'bg-red-100 text-red-800 hover:bg-red-100',
    },
  };

  const variant = variants[category];

  return (
    <Badge className={variant.className}>
      {percentage.toFixed(1)}%
    </Badge>
  );
}


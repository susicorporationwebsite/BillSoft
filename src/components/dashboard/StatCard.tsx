import { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/utils/billUtils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  isCurrency?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, isCurrency = false, trend, className = '' }: StatCardProps) {
  return (
    <div className={`stat-card animate-fade-in ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {isCurrency ? formatCurrency(value) : value.toLocaleString('en-IN')}
          </p>
          {trend && (
            <p className={`mt-1 text-sm ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

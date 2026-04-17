import { cn } from "@/lib/utils";

interface StatCardProps {
  value: string;
  label: string;
  className?: string;
}

/**
 * Displays a single statistic with a gradient-styled value (via .stat-number)
 * and a descriptive label beneath it.
 */
export const StatCard = ({ value, label, className }: StatCardProps) => (
  <div className={cn(className)} data-testid="stat-card">
    <span className="stat-number">{value}</span>
    <p>{label}</p>
  </div>
);

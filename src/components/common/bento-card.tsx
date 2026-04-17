import { cn } from "@/lib/utils";

type BentoSize = "lg" | "md" | "sm";

interface BentoCardProps {
  size: BentoSize;
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

const SIZE_PADDING: Record<BentoSize, string> = {
  lg: "p-8",
  md: "p-6",
  sm: "p-4",
};

const SIZE_TITLE: Record<BentoSize, string> = {
  lg: "text-xl",
  md: "text-lg",
  sm: "text-base",
};

const SIZE_DESCRIPTION: Record<BentoSize, string> = {
  lg: "text-base",
  md: "text-sm",
  sm: "text-sm",
};

/**
 * Bento-grid card with three size variants (lg/md/sm). Applies the
 * .bento-card utility class which provides hover and glassmorphism effects
 * defined in the global stylesheet.
 */
export const BentoCard = ({ size, title, description, icon, className }: BentoCardProps) => (
  <div
    className={cn("bento-card", SIZE_PADDING[size], className)}
    data-testid="bento-card"
    data-size={size}
  >
    {icon !== undefined && <div>{icon}</div>}
    <h3 className={SIZE_TITLE[size]}>{title}</h3>
    <p className={SIZE_DESCRIPTION[size]}>{description}</p>
  </div>
);

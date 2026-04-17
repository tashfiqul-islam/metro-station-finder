import { cn } from "@/lib/utils";

type BentoSize = "lg" | "md" | "sm";

interface BentoCardProps {
  size: BentoSize;
  title: string;
  description: string;
  icon?: React.ReactNode;
  visual?: React.ReactNode;
  accent?: string;
  className?: string;
}

const SIZE_PADDING: Record<BentoSize, string> = {
  lg: "p-8",
  md: "p-6",
  sm: "p-4",
};

const SIZE_TITLE: Record<BentoSize, string> = {
  lg: "text-xl font-bold",
  md: "text-lg font-bold",
  sm: "text-base font-semibold",
};

const SIZE_DESCRIPTION: Record<BentoSize, string> = {
  lg: "text-base text-muted-foreground",
  md: "text-sm text-muted-foreground",
  sm: "text-sm text-muted-foreground",
};

/**
 * Bento-grid card with three size variants (lg/md/sm). Features an optional
 * top accent shimmer, radial bloom glow, icon container, and visual preview
 * slot. Applies the .bento-card CSS class for global hover/glassmorphism effects.
 */
export const BentoCard = ({
  size,
  title,
  description,
  icon,
  visual,
  accent,
  className,
}: BentoCardProps) => (
  <div
    className={cn(
      "bento-card",
      "relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm transition-all duration-300",
      "hover:border-border/80 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5",
      SIZE_PADDING[size],
      className,
    )}
    data-testid="bento-card"
    data-size={size}
  >
    {/* Top accent shimmer line */}
    {accent !== undefined && (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />
    )}

    {/* Top radial bloom glow */}
    {accent !== undefined && (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full blur-2xl"
        style={{ background: accent }}
      />
    )}

    {/* Icon */}
    {icon !== undefined && (
      <div
        data-icon-wrapper
        className="mb-4 inline-flex rounded-xl border border-border/40 bg-muted/50 p-2.5"
      >
        {icon}
      </div>
    )}

    <h3 className={cn("mb-1.5", SIZE_TITLE[size])}>{title}</h3>
    <p className={SIZE_DESCRIPTION[size]}>{description}</p>

    {/* Visual preview slot — decorative */}
    {visual !== undefined && <div aria-hidden="true">{visual}</div>}
  </div>
);

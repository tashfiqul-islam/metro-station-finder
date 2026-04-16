import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type GlassCardProps = ComponentProps<"div">;

/**
 * Thin wrapper that applies the `.glass-card` utility class (glassmorphism effect).
 * Composes with additional className via cn().
 */
export const GlassCard = ({ className, children, ...props }: GlassCardProps) => (
  <div className={cn("glass-card", className)} {...props}>
    {children}
  </div>
);

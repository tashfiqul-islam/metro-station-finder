import { CaretRight } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";

import { withAlpha } from "@/lib/color";
import { cn } from "@/lib/utils";

interface AnimatedBadgeProps {
  text?: string;
  color?: string;
  href?: string;
}

/**
 * Animated pill-shaped badge with a rotating conic gradient shimmer.
 */
const AnimatedBadge = ({
  text = "Introducing Eldoraui",
  color = "#22d3ee",
  href,
}: AnimatedBadgeProps) => {
  const containerClassName = cn(
    "group relative inline-flex items-center rounded-full border shadow-sm transition-colors",
    "gap-3",
    "max-w-full",
    "px-4",
    "py-1.5",
    "font-medium",
    "text-xs",
    "border-neutral-300 bg-neutral-100 text-neutral-900",
    "dark:border-neutral-700/80 dark:bg-black dark:text-zinc-300 dark:shadow-none",
  );

  const content = (
    <motion.span
      className="relative inline-flex items-center overflow-hidden rounded-full"
      initial={{ filter: "blur(6px)", opacity: 0, y: 8 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      viewport={{ amount: 0.7, once: true }}
      whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
    >
      {/* Conic gradient shimmer border */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        style={{
          animation: "shimmer-spin 2.5s linear infinite",
          background: `conic-gradient(from var(--angle, 0deg), transparent 25%, ${color}, transparent 50%)`,
        }}
      />

      {/* Badge content — covers center, border shows around edge */}
      <span className={cn(containerClassName, "relative z-10")} style={{ margin: "2px" }}>
        <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: withAlpha(color, 0.35) }}
          />
          <span
            aria-hidden
            className="absolute h-full w-full animate-ping rounded-full"
            style={{ backgroundColor: withAlpha(color, 0.25) }}
          />
          <span
            aria-hidden
            className="relative block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        </span>

        <span aria-hidden className="relative h-4 w-px bg-neutral-300 dark:bg-neutral-600/80" />
        <span className="relative whitespace-nowrap text-neutral-900 dark:text-zinc-300">
          {text}
        </span>
        <CaretRight className="relative h-3.5 w-3.5 text-neutral-600 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-neutral-500" />
      </span>
    </motion.span>
  );

  return href ? (
    <Link className="inline-block" to={href}>
      {content}
    </Link>
  ) : (
    content
  );
};

export default AnimatedBadge;

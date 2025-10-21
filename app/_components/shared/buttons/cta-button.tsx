"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { memo, useOptimistic, useTransition } from "react";
import { ANIMATION_CONFIG } from "@/components/home/data/animation-config";
import type { CTAVariant } from "@/components/home/types";
import { cn } from "@/lib/utils";

type CTAButtonProps = {
  readonly href: string;
  readonly variant?: CTAVariant;
  readonly icon: React.ElementType;
  readonly children: React.ReactNode;
  readonly delay: number;
};

/**
 * Modern CTA button component with useTransition for smooth navigation
 */
export const CTAButton = memo(
  ({
    href,
    variant = "primary",
    icon: Icon,
    children,
    delay,
  }: CTAButtonProps): React.ReactElement => {
    const shouldReduceMotion = useReducedMotion();
    const router = useRouter();
    const [isPending, _startTransition] = useTransition();
    const [isOptimistic, addOptimistic] = useOptimistic(false, (_, newState: boolean) => newState);

    const handleClick = () => {
      _startTransition(() => {
        addOptimistic(true);
        // Use simple navigation without competing transitions
        router.push(href);
      });
    };

    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="w-full sm:w-auto"
        initial={{ opacity: 0, y: 20 }}
        style={{
          willChange: shouldReduceMotion ? "auto" : "transform, opacity",
        }}
        transition={{
          duration: ANIMATION_CONFIG.durations.fast,
          delay,
          ease: ANIMATION_CONFIG.ease,
        }}
      >
        <button
          className={cn(
            "group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-8 py-4 font-semibold text-sm shadow-lg transition-all duration-300 sm:w-auto",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            variant === "primary"
              ? "bg-primary text-primary-foreground shadow-primary/25 hover:shadow-primary/40 hover:shadow-xl disabled:hover:shadow-primary/25"
              : "border border-border/50 bg-background/50 text-foreground backdrop-blur-sm hover:bg-background/80"
          )}
          disabled={isPending || isOptimistic}
          onClick={handleClick}
          suppressHydrationWarning
          type="button"
        >
          {/* Hover effect */}
          <span className="absolute inset-0 translate-x-[-200%] bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[200%]" />

          {/* Content */}
          {isPending || isOptimistic ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
          )}
          <span className="relative">{children}</span>
          {variant === "primary" && !isPending && !isOptimistic && (
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
            />
          )}
        </button>
      </motion.div>
    );
  }
);

CTAButton.displayName = "CTAButton";

import type * as React from "react";
import { useCallback, useMemo } from "react";
import { useCustomLoading } from "@/lib/hooks/loading/use-custom-loading";
import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";
import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  onChange,
  "aria-busy": ariaBusy,
  ...props
}: React.ComponentProps<"input"> & {
  /** When true, onChange will be wrapped in a view transition */
  readonly "data-transition"?: boolean;
}) {
  const { startPageTransition } = useViewTransitions();
  const { isLoading } = useCustomLoading();

  const dataTransition = useMemo(() => props["data-transition"], [props["data-transition"]]);

  const handleChange = useCallback<NonNullable<React.ComponentProps<"input">["onChange"]>>(
    (event) => {
      if (dataTransition) {
        startPageTransition(() => {
          onChange?.(event);
        });
        return;
      }
      onChange?.(event);
    },
    [onChange, startPageTransition, dataTransition]
  );
  return (
    <input
      aria-busy={ariaBusy ?? isLoading}
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      data-slot="input"
      onChange={handleChange}
      suppressHydrationWarning
      type={type}
      {...props}
    />
  );
}

export { Input };

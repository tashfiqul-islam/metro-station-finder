import type * as React from "react";
import { useCallback } from "react";
import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";
import { cn } from "@/lib/utils";

function Card({ className, onClick, children, ...props }: React.ComponentProps<"div">) {
  const { startPageTransition } = useViewTransitions();
  // no-op handler reserved for future div interactions
  const handleClickButton = useCallback<NonNullable<React.ComponentProps<"button">["onClick"]>>(
    (event) => {
      startPageTransition(() => onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>));
    },
    [onClick, startPageTransition]
  );
  if (onClick) {
    return (
      <button
        className={cn(
          "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
          className
        )}
        data-slot="card"
        onClick={handleClickButton}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
        className
      )}
      data-slot="card"
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      data-slot="card-header"
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("font-semibold leading-none", className)}
      data-slot="card-title"
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="card-description"
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      data-slot="card-action"
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-6", className)} data-slot="card-content" {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      data-slot="card-footer"
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };

"use client";

import {
  HoverCard as HoverCardPrimitive,
  HoverCardContent as HoverCardPrimitiveContent,
  HoverCardTrigger as HoverCardPrimitiveTrigger,
} from "@radix-ui/react-hover-card";
import type * as React from "react";
import { useCallback } from "react";

import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";
import { cn } from "@/lib/utils";

function HoverCard({ ...props }: React.ComponentProps<typeof HoverCardPrimitive>) {
  return <HoverCardPrimitive data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({
  onClick,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitiveTrigger>) {
  const { startPageTransition } = useViewTransitions();

  const handleClick = useCallback<
    NonNullable<React.ComponentProps<typeof HoverCardPrimitiveTrigger>["onClick"]>
  >(
    (event) => {
      if (onClick) {
        startPageTransition(() => {
          onClick(event);
        });
      }
    },
    [onClick, startPageTransition]
  );

  return (
    <HoverCardPrimitiveTrigger data-slot="hover-card-trigger" onClick={handleClick} {...props} />
  );
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitiveContent>) {
  return (
    <HoverCardPrimitiveContent
      align={align}
      className={cn(
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in",
        className
      )}
      data-slot="hover-card-content"
      sideOffset={sideOffset}
      {...props}
    />
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };

"use client";

import {
  Anchor as PopoverAnchor,
  Content as PopoverContentPrimitive,
  Portal as PopoverPortal,
  Root as PopoverRoot,
  Trigger as PopoverTrigger,
} from "@radix-ui/react-popover";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Popover({ ...props }: React.ComponentProps<typeof PopoverRoot>) {
  return <PopoverRoot data-slot="popover" {...props} />;
}

function PopoverTriggerComponent({
  ...props
}: React.ComponentProps<typeof PopoverTrigger>) {
  return <PopoverTrigger data-slot="popover-trigger" {...props} />;
}

function PopoverContentComponent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverContentPrimitive>) {
  return (
    <PopoverPortal>
      <PopoverContentPrimitive
        align={align}
        className={cn(
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in",
          className
        )}
        data-slot="popover-content"
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPortal>
  );
}

function PopoverAnchorComponent({
  ...props
}: React.ComponentProps<typeof PopoverAnchor>) {
  return <PopoverAnchor data-slot="popover-anchor" {...props} />;
}

export {
  Popover,
  PopoverTriggerComponent as PopoverTrigger,
  PopoverContentComponent as PopoverContent,
  PopoverAnchorComponent as PopoverAnchor,
};

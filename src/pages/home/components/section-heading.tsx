import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  className?: string;
  description: string;
  descriptionClassName?: string;
  eyebrow: string;
  title: string;
}

export const SectionHeading = ({
  className,
  description,
  descriptionClassName,
  eyebrow,
  title,
}: SectionHeadingProps): ReactElement => (
  <div className={cn("max-w-xl", className)}>
    <div className="mb-4 flex items-center gap-3">
      <div aria-hidden className="h-px w-8 bg-primary/50" />
      <span className="section-kicker">{eyebrow}</span>
    </div>

    <h2 className="section-title-gradient font-heading text-3xl font-bold tracking-tight lg:text-4xl">
      {title}
    </h2>

    <p
      className={cn(
        "mt-5 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg",
        descriptionClassName,
      )}
    >
      {description}
    </p>
  </div>
);

SectionHeading.displayName = "SectionHeading";

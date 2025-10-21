"use client";

import { Github } from "lucide-react";
import { useCallback } from "react";

import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";
import { cn } from "@/lib/utils";

type GithubLinkProps = {
  readonly className?: string;
};

export function GithubLink({ className }: GithubLinkProps) {
  const { startPageTransition } = useViewTransitions();

  const handleClick = useCallback(
    (_event: React.MouseEvent<HTMLAnchorElement>) => {
      startPageTransition(() => {
        // Navigation handled by anchor href
      });
    },
    [startPageTransition]
  );

  return (
    <a
      aria-label="View project on GitHub"
      className={cn(
        "group flex h-8 w-8 items-center justify-center rounded-full bg-background ring-1 ring-border",
        "transition-all duration-200 hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      href="https://github.com/tashfiqul-islam/metro-station-finder"
      onClick={handleClick}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Github
        aria-hidden="true"
        className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-hover:text-primary"
      />
    </a>
  );
}

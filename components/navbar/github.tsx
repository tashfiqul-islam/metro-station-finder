"use client";

import { Github } from "lucide-react";
import { cn } from "@/lib/utils";

type GithubLinkProps = {
  readonly className?: string;
};

export function GithubLink({ className }: GithubLinkProps) {
  return (
    <a
      aria-label="View project on GitHub"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-background ring-1 ring-border",
        "transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      href="https://github.com/tashfiqul-islam/metro-station-finder"
      rel="noopener noreferrer"
      target="_blank"
    >
      <Github aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

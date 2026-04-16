import { GithubLogoIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export const GithubLink = () => (
  <a
    aria-label="View project on GitHub"
    className={cn(
      "group relative flex h-9 w-9 items-center justify-center rounded-full",
      "border border-input bg-background",
      "transition-all duration-200 hover:bg-accent/50",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    )}
    href="https://github.com/tashfiqul-islam/metro-station-finder"
    rel="noopener noreferrer"
    style={{
      backgroundColor: "var(--color-background)",
      borderColor: "var(--color-border)",
    }}
    target="_blank"
  >
    <GithubLogoIcon
      aria-hidden="true"
      className="h-4 w-4 transition-all duration-200 group-hover:scale-110"
    />
  </a>
);

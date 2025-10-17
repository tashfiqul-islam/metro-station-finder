"use client";

import { Github } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Glimpse,
  GlimpseContent,
  GlimpseDescription,
  GlimpseImage,
  GlimpseTitle,
  GlimpseTrigger,
} from "@/components/kibo-ui/glimpse";
import { cn } from "@/lib/utils";

type GithubGlimpseProps = {
  readonly className?: string;
};

type GlimpseData = {
  readonly title: string | null;
  readonly description: string | null;
  readonly image: string | null;
};

export function GithubGlimpse({ className }: GithubGlimpseProps) {
  const [glimpseData, setGlimpseData] = useState<GlimpseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGlimpseData = useCallback(async () => {
    if (glimpseData || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/github-glimpse");
      if (response.ok) {
        const data = await response.json();
        setGlimpseData(data);
      }
    } catch {
      // Silently handle errors for better UX
    } finally {
      setIsLoading(false);
    }
  }, [glimpseData, isLoading]);

  // Prefetch data on component mount
  useEffect(() => {
    fetchGlimpseData();
  }, [fetchGlimpseData]);

  return (
    <Glimpse closeDelay={100} openDelay={150}>
      <GlimpseTrigger asChild>
        <a
          aria-label="View project on GitHub"
          className={cn(
            "group flex h-8 w-8 items-center justify-center rounded-full bg-background ring-1 ring-border",
            "transition-all duration-200 hover:bg-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
          href="https://github.com/tashfiqul-islam/metro-station-finder"
          rel="noopener noreferrer"
          target="_blank"
        >
          <Github
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-hover:scale-110 group-hover:text-primary"
          />
        </a>
      </GlimpseTrigger>

      <GlimpseContent
        align="end"
        className="group w-80 overflow-hidden rounded-lg border bg-card/95 p-0 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/80"
        side="bottom"
        sideOffset={8}
      >
        {/* Primary green accent bar */}
        <div className="h-1.5 w-full bg-primary transition-colors duration-200" />

        {glimpseData?.image && (
          <GlimpseImage
            alt={glimpseData.title || "GitHub repository preview"}
            className="border-border/50 border-b object-cover shadow-sm"
            src={glimpseData.image}
          />
        )}

        <div className="p-4">
          <GlimpseTitle className="font-semibold text-base text-foreground">
            {glimpseData?.title || "Metro Station Finder"}
          </GlimpseTitle>
          <GlimpseDescription className="mt-1 line-clamp-2 text-muted-foreground text-sm">
            {glimpseData?.description ||
              "A modern metro station finder app for Dhaka with real-time fare calculation and Google Maps integration. Built with Next.js, TypeScript, and Tailwind CSS."}
          </GlimpseDescription>

          <div className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
            <Github className="h-3 w-3 text-primary transition-colors duration-200" />
            <span className="transition-colors duration-200 group-hover:text-primary">
              View on GitHub
            </span>
          </div>
        </div>
      </GlimpseContent>
    </Glimpse>
  );
}

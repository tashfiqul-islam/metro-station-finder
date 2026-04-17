import { Badge } from "@/components/ui/badge";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { cn } from "@/lib/utils";

interface VersionEntry {
  version: string;
  date: string;
  label: string;
  description: string;
  current: boolean;
}

const versions: VersionEntry[] = [
  {
    current: false,
    date: "October 2024",
    description: "Initial scaffold — TanStack Router, Tailwind v4, shadcn setup.",
    label: "First Commit",
    version: "v0.1.0",
  },
  {
    current: false,
    date: "November 2024",
    description: "All 17 MRT Line 6 stations loaded with coordinates and metadata.",
    label: "Station Data",
    version: "v0.2.0",
  },
  {
    current: false,
    date: "January 2025",
    description: "Complete fare matrix with single, return, and MRT Pass pricing.",
    label: "Fare Engine",
    version: "v0.5.0",
  },
  {
    current: true,
    date: "April 2026",
    description: "Full UI/UX overhaul, world-class design system, trip planner foundation.",
    label: "You are here",
    version: "v1.0.0",
  },
];

export const JourneySection = (): React.ReactElement => (
  <section className="py-20">
    <div className="container mx-auto px-4">
      <ViewportAnimation>
        <div className="mb-12">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold">The journey</h2>
          <p className="text-muted-foreground mt-2">How metro-station-finder evolved.</p>
        </div>
      </ViewportAnimation>

      <div className="relative max-w-2xl">
        {/* Vertical dashed line */}
        <div className="absolute left-4 top-0 bottom-0 w-px border-l-2 border-dashed border-border" />

        {/* Version entries */}
        <div className="flex flex-col gap-8">
          {versions.map((v, i) => (
            <ViewportAnimation key={v.version} delay={i * 0.1}>
              <div className="relative flex gap-6 pl-12">
                {/* Route dot */}
                <div
                  className={cn(
                    "absolute left-2 top-1 -translate-x-1/2",
                    v.current ? "route-stop route-stop--current" : "route-stop",
                  )}
                />

                {/* Content */}
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {v.version}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{v.date}</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold">{v.label}</h3>
                  <p className="text-muted-foreground text-sm">{v.description}</p>
                </div>
              </div>
            </ViewportAnimation>
          ))}
        </div>
      </div>
    </div>
  </section>
);

JourneySection.displayName = "JourneySection";

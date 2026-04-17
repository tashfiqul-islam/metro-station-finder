import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTION_IDS = ["overview", "mission", "tech-stack", "contact"] as const;
type SectionId = (typeof SECTION_IDS)[number];

const OverviewSection = () => (
  <div className="prose prose-neutral dark:prose-invert max-w-none">
    <h2 className="font-heading text-2xl font-bold">Overview</h2>
    <p>
      metro-station-finder is a purpose-built tool for navigating Dhaka&apos;s MRT Line 6 —
      Bangladesh&apos;s first metro rail system. It provides real-time station information, fare
      calculations, and trip planning for all 17 stations across the 20.1 km network.
    </p>
    <p>
      Built with modern web technologies, it aims to be the most reliable and user-friendly MRT
      reference for Dhaka commuters.
    </p>
  </div>
);

const MissionSection = () => (
  <div className="prose prose-neutral dark:prose-invert max-w-none">
    <h2 className="font-heading text-2xl font-bold">Mission</h2>
    <p>
      To make public transit information in Dhaka accessible, accurate, and instant. Every commuter
      deserves to know their fare before they board and their route before they travel.
    </p>
    <p>
      This project is open source and community-driven. Contributions, corrections, and feedback are
      always welcome.
    </p>
  </div>
);

const TechStackAboutSection = () => {
  const technologies = [
    "React 19",
    "TypeScript",
    "TanStack Start",
    "Tailwind v4",
    "shadcn/ui",
    "Vite + Rolldown",
    "Vitest",
    "Bun",
    "MapLibre GL",
    "Phosphor Icons",
  ];

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold mb-6">Tech Stack</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {technologies.map((tech) => (
          <div key={tech} className="px-3 py-2 rounded-lg border border-border text-sm font-medium">
            {tech}
          </div>
        ))}
      </div>
    </div>
  );
};

const ContactSection = () => (
  <div>
    <h2 className="font-heading text-2xl font-bold mb-4">Contact</h2>
    <p className="text-muted-foreground mb-6">
      Have a suggestion or found a data issue? Reach out via GitHub.
    </p>
    <div className="flex gap-3">
      <Button
        variant="outline"
        asChild={
          <a
            href="https://github.com/tashfiqul-islam/metro-station-finder"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open an Issue
          </a>
        }
      />
    </div>
  </div>
);

export const About = () => {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  return (
    <div className="container mx-auto px-4 py-12" suppressHydrationWarning>
      <div className="mb-10">
        <h1 className="font-heading text-4xl lg:text-5xl font-bold">About</h1>
        <p className="text-muted-foreground mt-2">The story behind metro-station-finder.</p>
      </div>

      <div className="flex gap-12">
        {/* Sidebar nav — desktop: sticky left, mobile: horizontal pills */}
        <nav
          className="hidden lg:flex flex-col gap-1 w-44 shrink-0 sticky top-24 self-start"
          aria-label="Section navigation"
        >
          {SECTION_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "text-left px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
                activeSection === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
              data-section={id}
            >
              {id.replace("-", " ")}
            </button>
          ))}
        </nav>

        {/* Mobile pill row */}
        <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 mb-6 w-full">
          {SECTION_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors border",
                activeSection === id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {id.replace("-", " ")}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {activeSection === "overview" && <OverviewSection />}
          {activeSection === "mission" && <MissionSection />}
          {activeSection === "tech-stack" && <TechStackAboutSection />}
          {activeSection === "contact" && <ContactSection />}
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/about")({
  component: About,
});

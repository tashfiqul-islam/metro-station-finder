import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { ViewportAnimation } from "./viewport-animation";

interface FeatureItem {
  icon: React.ReactNode;
  label: string;
}

interface FeaturePreviewPageProps {
  title: string;
  description: string;
  features: FeatureItem[];
  progress: number;
  eta?: string;
}

export const FeaturePreviewPage = ({
  title,
  description,
  features,
  progress,
  eta = "Coming Q3 2026",
}: FeaturePreviewPageProps): React.ReactElement => (
  <div className="container mx-auto px-4 py-16 max-w-2xl" data-testid="feature-preview-page">
    {/* Hero */}
    <ViewportAnimation>
      <div className="mb-10">
        <Badge variant="outline" className="mb-4">
          {eta}
        </Badge>
        <h1 className="font-heading text-4xl lg:text-5xl font-bold mb-3">{title}</h1>
        <p className="text-muted-foreground text-lg">{description}</p>
      </div>
    </ViewportAnimation>

    {/* Feature chips */}
    <ViewportAnimation delay={0.1}>
      <div className="flex flex-wrap gap-2 mb-10">
        {features.map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium"
          >
            {f.icon}
            {f.label}
          </div>
        ))}
      </div>
    </ViewportAnimation>

    {/* Mock wireframe skeleton */}
    <ViewportAnimation delay={0.2}>
      <div className="border border-border rounded-xl p-6 mb-10 space-y-3" aria-hidden="true">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </ViewportAnimation>

    {/* Progress */}
    <ViewportAnimation delay={0.3}>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Development progress</span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </ViewportAnimation>
  </div>
);

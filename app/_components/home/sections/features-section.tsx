"use client";

import { memo } from "react";
import { FEATURES_DATA } from "@/components/home/data/features-data";
import { FeatureCard } from "@/components/shared/cards/feature-card";

/**
 * Features section with useDeferredValue for smooth rendering
 */
export const FeaturesSection = memo(
  (): React.ReactElement => (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl">
            Everything You Need
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Powerful features designed to make your metro journey seamless and stress-free.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES_DATA.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
);

FeaturesSection.displayName = "FeaturesSection";

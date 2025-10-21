"use client";

import { memo } from "react";
import { BENEFITS_DATA } from "@/components/home/data/benefits-data";
import { BenefitCard } from "@/components/shared/cards/benefit-card";

/**
 * Benefits section
 */
export const BenefitsSection = memo(
  (): React.ReactElement => (
    <section className="bg-gradient-to-br from-primary/5 via-transparent to-transparent py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl">
            Why Choose Metro Station Finder?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Built with modern technology and user experience in mind.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS_DATA.map((benefit, index) => (
            <BenefitCard key={benefit.title} {...benefit} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
);

BenefitsSection.displayName = "BenefitsSection";

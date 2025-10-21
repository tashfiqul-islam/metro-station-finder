"use client";

import { memo } from "react";
import { TESTIMONIALS_DATA } from "@/components/home/data/testimonials-data";
import { TestimonialCard } from "@/components/shared/cards/testimonial-card";

/**
 * Testimonials section
 */
export const TestimonialsSection = memo(
  (): React.ReactElement => (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl">
            What Our Users Say
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Join thousands of satisfied commuters who rely on Metro Station Finder daily.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS_DATA.map((testimonial, index) => (
            <TestimonialCard key={testimonial.name} {...testimonial} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
);

TestimonialsSection.displayName = "TestimonialsSection";

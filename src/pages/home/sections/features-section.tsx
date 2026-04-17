import {
  CurrencyCircleDollar,
  MagnifyingGlass,
  MapTrifold,
  Wheelchair,
  WifiHigh,
} from "@phosphor-icons/react";

import { BentoCard } from "@/components/common/bento-card";
import { ViewportAnimation } from "@/components/common/viewport-animation";

export const FeaturesSection = (): React.ReactElement => (
  <section aria-label="Features" className="py-20">
    <div className="container mx-auto px-4">
      <ViewportAnimation>
        <div className="mb-10">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold">Everything you need</h2>
          <p className="text-muted-foreground mt-2">Tools built for Dhaka commuters.</p>
        </div>
      </ViewportAnimation>

      <ViewportAnimation delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <BentoCard
            size="lg"
            className="md:col-span-2"
            icon={<MagnifyingGlass size={32} weight="duotone" />}
            title="Station Search"
            description="Find any of the 17 MRT Line 6 stations instantly. Search by name, get location details, nearby landmarks, and real-time service information for every stop on the line."
          />

          <BentoCard
            size="md"
            icon={<CurrencyCircleDollar size={28} weight="duotone" />}
            title="Fare Calculator"
            description="Calculate exact fares between any two stations. Get single journey, return trip, and MRT Pass pricing in seconds."
          />

          <BentoCard
            size="md"
            icon={<MapTrifold size={28} weight="duotone" />}
            title="Trip Planning"
            description="Plan multi-leg journeys with optimal routes, estimated travel times, and interchange guidance across the network."
          />

          <BentoCard
            size="sm"
            icon={<WifiHigh size={24} weight="duotone" />}
            title="Live Updates"
            description="Service status and platform information updated in real time."
          />

          <BentoCard
            size="sm"
            icon={<Wheelchair size={24} weight="duotone" />}
            title="Accessibility"
            description="Lift locations, accessible routes, and mobility aid facilities at every station."
          />
        </div>
      </ViewportAnimation>
    </div>
  </section>
);

FeaturesSection.displayName = "FeaturesSection";

import { GitBranchIcon, GithubLogoIcon } from "@phosphor-icons/react";
import { memo } from "react";

import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const MaintainerSection = memo(
  (): React.ReactElement => (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <ViewportAnimation>
          <div
            className="rounded-2xl overflow-hidden border border-border"
            data-testid="maintainer-card"
          >
            <div className="flex flex-col lg:flex-row">
              {/* Left panel — Metro Green background */}
              <div className="lg:w-2/5 bg-primary p-10 flex flex-col items-center justify-center gap-6 text-primary-foreground">
                <Avatar className="h-20 w-20 border-2 border-primary-foreground/30">
                  <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground font-heading text-2xl font-bold">
                    TI
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="font-heading text-3xl lg:text-4xl font-bold">Tashfiqul Islam</h2>
                  <p className="text-primary-foreground/70 text-sm mt-1">Dhaka, Bangladesh</p>
                </div>
              </div>

              {/* Right panel */}
              <div className="lg:w-3/5 p-10 flex flex-col justify-center gap-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Creator &amp; Maintainer
                  </span>
                  <h3 className="font-heading text-2xl font-bold mt-2">
                    Building for Dhaka commuters
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Software engineer passionate about solving real-world urban mobility problems.
                  metro-station-finder started as a personal frustration with fragmented MRT
                  information and grew into a tool used by thousands of Dhaka commuters daily.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild={
                      <a
                        href="https://github.com/tashfiqul-islam"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <GithubLogoIcon size={16} weight="fill" className="mr-2" />
                        GitHub
                      </a>
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    asChild={
                      <a
                        href="https://github.com/tashfiqul-islam/metro-station-finder"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <GitBranchIcon size={16} weight="duotone" className="mr-2" />
                        Repository
                      </a>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </ViewportAnimation>
      </div>
    </section>
  ),
);

MaintainerSection.displayName = "MaintainerSection";

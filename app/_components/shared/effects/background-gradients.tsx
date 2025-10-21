"use client";

import { memo } from "react";

/**
 * Background gradients component
 */
export const BackgroundGradients = memo(
  (): React.ReactElement => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
      <div
        className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
        style={{
          animation: "float 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        style={{
          animation: "float 25s ease-in-out infinite reverse",
        }}
      />

      <style jsx>{`
      @keyframes float {
        0%,
        100% {
          transform: translateY(0) translateX(0);
        }
        50% {
          transform: translateY(-50px) translateX(50px);
        }
      }
    `}</style>
    </div>
  )
);

BackgroundGradients.displayName = "BackgroundGradients";

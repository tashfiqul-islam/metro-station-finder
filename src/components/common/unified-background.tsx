import { memo } from "react";

export const UnifiedBackground = memo(
  (): React.ReactElement => (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_32%_16%_at_50%_8%,oklch(0.51_0.175_145/0.028),transparent_72%),radial-gradient(ellipse_24%_16%_at_16%_22%,oklch(0.51_0.175_145/0.032),transparent_76%),radial-gradient(ellipse_28%_18%_at_84%_80%,oklch(0.58_0.14_70/0.024),transparent_76%)] dark:bg-[radial-gradient(ellipse_38%_18%_at_50%_8%,oklch(0.64_0.20_145/0.09),transparent_72%),radial-gradient(ellipse_24%_16%_at_16%_22%,oklch(0.64_0.20_145/0.08),transparent_76%),radial-gradient(ellipse_28%_18%_at_84%_80%,oklch(0.58_0.14_70/0.06),transparent_76%)]" />
      <div className="absolute -top-40 -left-32 h-120 w-120 rounded-full bg-primary/4 blur-[110px] dark:bg-primary/10" />
      <div className="absolute -right-40 bottom-0 h-120 w-120 rounded-full bg-primary/3 blur-[96px] dark:bg-primary/8" />
    </div>
  ),
);

UnifiedBackground.displayName = "UnifiedBackground";

"use client";

import { motion } from "motion/react";
import type React from "react";
import { cn } from "@/lib/utils";

export const BackgroundGradient = ({
  children,
  className,
  containerClassName,
  animate = true,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}) => {
  const variants = {
    initial: {
      backgroundPosition: "0 50%",
    },
    animate: {
      backgroundPosition: ["0, 50%", "100% 50%", "0 50%"],
    },
  };

  return (
    <div className={cn("group relative p-[4px]", containerClassName)}>
      {/* Dark mode gradient */}
      <motion.div
        {...(animate && {
          animate: "animate",
          initial: "initial",
          transition: {
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          },
          variants,
        })}
        className="absolute inset-0 z-[1] hidden rounded-3xl opacity-20 blur-2xl transition duration-500 will-change-transform group-hover:opacity-40 dark:block dark:opacity-20 dark:group-hover:opacity-40"
        style={{
          background:
            "radial-gradient(circle_farthest-side_at_0_100%,#10b981,transparent),radial-gradient(circle_farthest-side_at_100%_0,#22c55e,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#16a34a,transparent),radial-gradient(circle_farthest-side_at_0_0,#10b981,#141316)",
          backgroundSize: animate ? "400% 400%" : undefined,
        }}
      />
      <motion.div
        {...(animate && {
          animate: "animate",
          initial: "initial",
          transition: {
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          },
          variants,
        })}
        className="absolute inset-0 z-[1] hidden rounded-3xl will-change-transform dark:block"
        style={{
          background:
            "radial-gradient(circle_farthest-side_at_0_100%,#10b981,transparent),radial-gradient(circle_farthest-side_at_100%_0,#22c55e,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#16a34a,transparent),radial-gradient(circle_farthest-side_at_0_0,#10b981,#141316)",
          backgroundSize: animate ? "400% 400%" : undefined,
        }}
      />

      {/* Light mode gradient */}
      <motion.div
        {...(animate && {
          animate: "animate",
          initial: "initial",
          transition: {
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          },
          variants,
        })}
        className="absolute inset-0 z-[1] block rounded-3xl opacity-10 blur-2xl transition duration-500 will-change-transform group-hover:opacity-20 dark:hidden"
        style={{
          background:
            "radial-gradient(circle_farthest-side_at_0_100%,#10b981,transparent),radial-gradient(circle_farthest-side_at_100%_0,#22c55e,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#16a34a,transparent),radial-gradient(circle_farthest-side_at_0_0,#10b981,#f8fafc)",
          backgroundSize: animate ? "400% 400%" : undefined,
        }}
      />
      <motion.div
        {...(animate && {
          animate: "animate",
          initial: "initial",
          transition: {
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          },
          variants,
        })}
        className="absolute inset-0 z-[1] block rounded-3xl will-change-transform dark:hidden"
        style={{
          background:
            "radial-gradient(circle_farthest-side_at_0_100%,#10b981,transparent),radial-gradient(circle_farthest-side_at_100%_0,#22c55e,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#16a34a,transparent),radial-gradient(circle_farthest-side_at_0_0,#10b981,#f8fafc)",
          backgroundSize: animate ? "400% 400%" : undefined,
        }}
      />

      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
};

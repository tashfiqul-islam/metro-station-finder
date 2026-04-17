import { motion } from "motion/react";

interface ViewportAnimationProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Wraps children in a motion.div that animates from opacity-0/y-20 to
 * opacity-1/y-0 when the element enters the viewport. Animation fires once.
 */
export const ViewportAnimation = ({ children, delay = 0, className }: ViewportAnimationProps) => (
  <motion.div
    className={className}
    data-testid="viewport-animation"
    initial={{ opacity: 0, y: 20 }}
    viewport={{ once: true }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {children}
  </motion.div>
);

interface ViewportAnimationProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const ViewportAnimation = ({ children, delay = 0, className }: ViewportAnimationProps) => (
  <div
    className={className}
    data-testid="viewport-animation"
    style={delay > 0 ? { animationDelay: `${delay}s` } : undefined}
  >
    {children}
  </div>
);

import type { ReactNode } from "react";

interface MapCanvasClientProps {
  children?: ReactNode;
  className?: string;
}

export const MapCanvasClient = ({
  children,
  className,
}: MapCanvasClientProps): React.ReactElement => <div className={className}>{children}</div>;

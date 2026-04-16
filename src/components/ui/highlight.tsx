import { AnimatePresence, motion } from "motion/react";
import type { Transition } from "motion/react";
import React, {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ElementType, ReactElement, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

type HighlightMode = "children" | "parent";

interface Bounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface HighlightContextType<T extends string> {
  as?: keyof HTMLElementTagNameMap;
  mode: HighlightMode;
  activeValue: T | null;
  setActiveValue: (value: T | null) => void;
  setBounds: (bounds: DOMRect) => void;
  clearBounds: () => void;
  id: string;
  hover: boolean;
  click: boolean;
  className: string | undefined;
  style: CSSProperties | undefined;
  activeClassName?: string;
  setActiveClassName: (className: string) => void;
  transition?: Transition;
  disabled?: boolean;
  enabled?: boolean;
  exitDelay?: number;
  forceUpdateBounds: boolean | undefined;
}

const HighlightContext = createContext<HighlightContextType<string> | undefined>(undefined);

const useHighlight = <T extends string>(): HighlightContextType<T> => {
  const context = useContext(HighlightContext);
  if (!context) {
    throw new Error("useHighlight must be used within a HighlightProvider");
  }
  return context as unknown as HighlightContextType<T>;
};

interface BaseHighlightProps<T extends ElementType = "div"> {
  as?: T;
  ref?: Ref<HTMLDivElement>;
  mode?: HighlightMode;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  className?: string;
  style?: CSSProperties;
  transition?: Transition;
  hover?: boolean;
  click?: boolean;
  disabled?: boolean;
  enabled?: boolean;
  exitDelay?: number;
}

interface ParentModeHighlightProps {
  boundsOffset?: Partial<Bounds>;
  containerClassName?: string;
  forceUpdateBounds?: boolean;
}

type ControlledParentModeHighlightProps<T extends ElementType = "div"> = BaseHighlightProps<T> &
  ParentModeHighlightProps & {
    mode: "parent";
    controlledItems: true;
    children: ReactNode;
  };

type ControlledChildrenModeHighlightProps<T extends ElementType = "div"> = BaseHighlightProps<T> & {
  mode?: "children" | undefined;
  controlledItems: true;
  children: ReactNode;
};

type UncontrolledParentModeHighlightProps<T extends ElementType = "div"> = BaseHighlightProps<T> &
  ParentModeHighlightProps & {
    mode: "parent";
    controlledItems?: false;
    itemsClassName?: string;
    children: ReactElement | ReactElement[];
  };

type UncontrolledChildrenModeHighlightProps<T extends ElementType = "div"> =
  BaseHighlightProps<T> & {
    mode?: "children";
    controlledItems?: false;
    itemsClassName?: string;
    children: ReactElement | ReactElement[];
  };

type HighlightProps<T extends ElementType = "div"> =
  | ControlledParentModeHighlightProps<T>
  | ControlledChildrenModeHighlightProps<T>
  | UncontrolledParentModeHighlightProps<T>
  | UncontrolledChildrenModeHighlightProps<T>;

interface UseHighlightItemEffectArgs {
  mode: HighlightMode;
  isActive: boolean;
  activeValue: string | null;
  setBounds: (bounds: DOMRect) => void;
  clearBounds: () => void;
  activeClassName?: string;
  setActiveClassName: (className: string) => void;
  forceUpdateBounds?: boolean;
  contextForceUpdateBounds?: boolean;
  localRef: React.RefObject<HTMLDivElement | null>;
}

const useHighlightItemEffect = ({
  mode,
  isActive,
  activeValue,
  setBounds,
  clearBounds,
  activeClassName,
  setActiveClassName,
  forceUpdateBounds,
  contextForceUpdateBounds,
  localRef,
}: UseHighlightItemEffectArgs) => {
  useEffect(() => {
    if (mode !== "parent") {
      return;
    }
    let rafId: number;
    let previousBounds: Bounds | null = null;
    const shouldUpdateBounds =
      forceUpdateBounds === true || (contextForceUpdateBounds && forceUpdateBounds !== false);

    const updateBounds = () => {
      if (!localRef.current) {
        return;
      }
      const bounds = localRef.current.getBoundingClientRect();
      if (shouldUpdateBounds) {
        if (
          previousBounds?.top === bounds.top &&
          previousBounds?.left === bounds.left &&
          previousBounds?.width === bounds.width &&
          previousBounds?.height === bounds.height
        ) {
          rafId = requestAnimationFrame(updateBounds);
          return;
        }
        previousBounds = bounds;
        rafId = requestAnimationFrame(updateBounds);
      }
      setBounds(bounds);
    };

    if (isActive) {
      updateBounds();
      setActiveClassName(activeClassName ?? "");
    } else if (!activeValue) {
      clearBounds();
    }

    return shouldUpdateBounds
      ? () => {
          cancelAnimationFrame(rafId);
        }
      : undefined;
  }, [
    mode,
    isActive,
    activeValue,
    setBounds,
    clearBounds,
    activeClassName,
    setActiveClassName,
    forceUpdateBounds,
    contextForceUpdateBounds,
    localRef,
  ]);
};

const buildCommonHandlers = (
  hover: boolean,
  click: boolean,
  childValue: string,
  setActiveValue: (value: string | null) => void,
  element: ReactElement<ExtendedChildProps>,
): Record<string, (e: React.MouseEvent<HTMLDivElement>) => void> => {
  if (hover) {
    return {
      onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
        setActiveValue(childValue);
        element.props.onMouseEnter?.(e);
      },
      onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
        setActiveValue(null);
        element.props.onMouseLeave?.(e);
      },
    };
  }
  if (click) {
    return {
      onClick: (e: React.MouseEvent<HTMLDivElement>) => {
        setActiveValue(childValue);
        element.props.onClick?.(e);
      },
    };
  }
  return {};
};

const getNonOverridingDataAttributes = (
  element: ReactElement,
  dataAttributes: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(dataAttributes)) {
    if ((element.props as Record<string, unknown>)[key] === undefined) {
      result[key] = dataAttributes[key];
    }
  }
  return result;
};

type ExtendedChildProps = React.ComponentProps<"div"> & {
  id?: string;
  ref?: Ref<HTMLElement>;
  "data-active"?: string;
  "data-value"?: string;
  "data-disabled"?: boolean;
  "data-highlight"?: boolean;
  "data-slot"?: string;
};

type HighlightItemProps<T extends ElementType = "div"> = React.ComponentProps<T> & {
  as?: T;
  children: ReactElement;
  id?: string;
  value?: string;
  className?: string;
  style?: CSSProperties;
  transition?: Transition;
  activeClassName?: string;
  disabled?: boolean;
  exitDelay?: number;
  asChild?: boolean;
  forceUpdateBounds?: boolean;
};

// eslint-disable-next-line complexity -- polymorphic component with inherent multi-mode branching
const HighlightItem = <T extends ElementType>({
  ref,
  as,
  children,
  id,
  value,
  className,
  style,
  transition,
  disabled = false,
  activeClassName,
  exitDelay,
  asChild = false,
  forceUpdateBounds,
  ...props
}: HighlightItemProps<T>) => {
  const itemId = useId();
  const {
    activeValue,
    setActiveValue,
    mode,
    setBounds,
    clearBounds,
    hover,
    click,
    enabled,
    className: contextClassName,
    style: contextStyle,
    transition: contextTransition,
    id: contextId,
    disabled: contextDisabled,
    exitDelay: contextExitDelay,
    forceUpdateBounds: contextForceUpdateBounds,
    setActiveClassName,
  } = useHighlight();

  const Component = as ?? "div";
  const element = children as ReactElement<ExtendedChildProps>;
  const childValue = id ?? value ?? element.props?.["data-value"] ?? element.props?.id ?? itemId;
  const isActive = activeValue === childValue;
  const isDisabled = disabled === undefined ? contextDisabled : disabled;
  const itemTransition = transition ?? contextTransition;

  const localRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  useHighlightItemEffect({
    activeClassName,
    activeValue,
    clearBounds,
    contextForceUpdateBounds,
    forceUpdateBounds,
    isActive,
    localRef,
    mode,
    setActiveClassName,
    setBounds,
  });

  if (!isValidElement(children)) {
    return children;
  }

  const dataAttributes = {
    "aria-selected": isActive,
    "data-active": isActive ? "true" : "false",
    "data-disabled": isDisabled,
    "data-highlight": true,
    "data-value": childValue,
  };

  const commonHandlers = buildCommonHandlers(hover, click, childValue, setActiveValue, element);

  if (asChild) {
    if (mode === "children") {
      return React.cloneElement(
        element,
        {
          className: cn("relative", element.props.className),
          key: childValue,
          ref: localRef,
          ...getNonOverridingDataAttributes(element, {
            ...dataAttributes,
            "data-slot": "motion-highlight-item-container",
          }),
          ...commonHandlers,
          ...props,
        },
        <>
          <AnimatePresence initial={false} mode="wait">
            {isActive && !isDisabled && (
              <motion.div
                animate={{ opacity: 1 }}
                className={cn(contextClassName, activeClassName)}
                data-slot="motion-highlight"
                exit={{
                  opacity: 0,
                  transition: {
                    ...itemTransition,
                    delay:
                      (itemTransition?.delay ?? 0) + (exitDelay ?? contextExitDelay ?? 0) / 1000,
                  },
                }}
                initial={{ opacity: 0 }}
                layoutId={`transition-background-${contextId}`}
                style={{
                  position: "absolute",
                  zIndex: 0,
                  ...contextStyle,
                  ...style,
                }}
                transition={itemTransition}
                {...dataAttributes}
              />
            )}
          </AnimatePresence>

          <Component
            className={className}
            data-slot="motion-highlight-item"
            style={{ position: "relative", zIndex: 1 }}
            {...dataAttributes}
          >
            {children}
          </Component>
        </>,
      );
    }

    return React.cloneElement(element, {
      ref: localRef,
      ...getNonOverridingDataAttributes(element, {
        ...dataAttributes,
        "data-slot": "motion-highlight-item",
      }),
      ...commonHandlers,
    });
  }

  return enabled ? (
    <Component
      className={cn(mode === "children" && "relative", className)}
      data-slot="motion-highlight-item-container"
      key={childValue}
      ref={localRef}
      {...dataAttributes}
      {...props}
      {...commonHandlers}
    >
      {mode === "children" && (
        <AnimatePresence initial={false} mode="wait">
          {isActive && !isDisabled && (
            <motion.div
              animate={{ opacity: 1 }}
              className={cn(contextClassName, activeClassName)}
              data-slot="motion-highlight"
              exit={{
                opacity: 0,
                transition: {
                  ...itemTransition,
                  delay: (itemTransition?.delay ?? 0) + (exitDelay ?? contextExitDelay ?? 0) / 1000,
                },
              }}
              initial={{ opacity: 1 }}
              layoutId={`transition-background-${contextId}`}
              style={{
                position: "absolute",
                zIndex: 0,
                ...contextStyle,
                ...style,
              }}
              transition={itemTransition}
              {...dataAttributes}
            />
          )}
        </AnimatePresence>
      )}

      {React.cloneElement(element, {
        className: element.props.className,
        style: { position: "relative", zIndex: 1 },
        ...getNonOverridingDataAttributes(element, {
          ...dataAttributes,
          "data-active": isActive ? "true" : "false",
          "data-slot": "motion-highlight-item",
        }),
      })}
    </Component>
  ) : (
    children
  );
};

const Highlight = <T extends ElementType = "div">({ ref, ...props }: HighlightProps<T>) => {
  const {
    as: Component = "div",
    children,
    value,
    defaultValue,
    onValueChange,
    className,
    style,
    transition = { damping: 35, stiffness: 350, type: "spring" },
    hover = false,
    click = true,
    enabled = true,
    controlledItems,
    disabled = false,
    exitDelay = 200,
    mode = "children",
  } = props;

  const boundsOffset = (props as ParentModeHighlightProps)?.boundsOffset;
  const itemsClassName = (
    props as UncontrolledParentModeHighlightProps<T> | UncontrolledChildrenModeHighlightProps<T>
  )?.itemsClassName;
  const containerClassName = (props as ParentModeHighlightProps)?.containerClassName;
  const forceUpdateBounds = (props as ParentModeHighlightProps)?.forceUpdateBounds;

  const localRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  const [activeValue, setActiveValue] = useState<string | null>(value ?? defaultValue ?? null);
  const [boundsState, setBoundsState] = useState<Bounds | null>(null);
  const [activeClassNameState, setActiveClassNameState] = useState<string>("");

  const safeSetActiveValue = useCallback(
    (valueId: string | null) => {
      setActiveValue((prev) => (prev === valueId ? prev : valueId));
      if (valueId !== activeValue) {
        onValueChange?.(valueId);
      }
    },
    [activeValue, onValueChange],
  );

  const safeSetBounds = useCallback(
    (bounds: DOMRect) => {
      if (!localRef.current) {
        return;
      }

      const offset = boundsOffset ?? { height: 0, left: 0, top: 0, width: 0 };
      const containerRect = localRef.current.getBoundingClientRect();
      const newBounds: Bounds = {
        height: bounds.height + (offset.height ?? 0),
        left: bounds.left - containerRect.left + (offset.left ?? 0),
        top: bounds.top - containerRect.top + (offset.top ?? 0),
        width: bounds.width + (offset.width ?? 0),
      };

      setBoundsState((prev) => {
        if (
          prev?.top === newBounds.top &&
          prev?.left === newBounds.left &&
          prev?.width === newBounds.width &&
          prev?.height === newBounds.height
        ) {
          return prev;
        }
        return newBounds;
      });
    },
    [boundsOffset],
  );

  const clearBounds = useCallback(() => {
    setBoundsState((prev) => (prev === null ? prev : null));
  }, []);

  useEffect(() => {
    if (value !== undefined) {
      setActiveValue(value);
    } else if (defaultValue !== undefined) {
      setActiveValue(defaultValue);
    }
  }, [value, defaultValue]);

  const id = useId();

  useEffect(() => {
    if (mode !== "parent") {
      return;
    }
    const container = localRef.current;
    if (!container) {
      return;
    }

    const onScroll = () => {
      if (!activeValue) {
        return;
      }
      const activeEl = container.querySelector<HTMLElement>(
        `[data-value="${activeValue}"][data-highlight="true"]`,
      );
      if (activeEl) {
        safeSetBounds(activeEl.getBoundingClientRect());
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
    };
  }, [mode, activeValue, safeSetBounds]);

  const render = useCallback(
    (renderChildren: ReactNode) => {
      if (mode === "parent") {
        const motionStyle: Record<string, unknown> = { position: "absolute", zIndex: 0 };
        if (style) {
          Object.assign(motionStyle, style);
        }

        const containerContent = (
          <>
            <AnimatePresence initial={false} mode="wait">
              {boundsState && (
                <motion.div
                  animate={{
                    height: boundsState.height,
                    left: boundsState.left,
                    opacity: 1,
                    top: boundsState.top,
                    width: boundsState.width,
                  }}
                  className={cn(className, activeClassNameState)}
                  data-slot="motion-highlight"
                  exit={{
                    opacity: 0,
                    transition: {
                      ...transition,
                      delay: (transition?.delay ?? 0) + (exitDelay ?? 0) / 1000,
                    },
                  }}
                  initial={{
                    height: boundsState.height,
                    left: boundsState.left,
                    opacity: 0,
                    top: boundsState.top,
                    width: boundsState.width,
                  }}
                  style={motionStyle}
                  transition={transition}
                />
              )}
            </AnimatePresence>
            {renderChildren}
          </>
        );

        return React.createElement(
          Component,
          {
            className: containerClassName,
            "data-slot": "motion-highlight-container",
            ref: localRef,
            style: { position: "relative", zIndex: 1 },
          } as React.ComponentPropsWithoutRef<T>,
          containerContent,
        );
      }

      return renderChildren;
    },
    [
      mode,
      Component,
      containerClassName,
      boundsState,
      transition,
      exitDelay,
      style,
      className,
      activeClassNameState,
    ],
  );

  const renderedContent: ReactNode = enabled
    ? render(
        controlledItems
          ? children
          : Children.map(children, (child, index) => {
              const childKey = (child as ReactElement)?.key ?? `highlight-item-${index}`;
              return (
                <HighlightItem className={itemsClassName} key={childKey}>
                  {child}
                </HighlightItem>
              );
            }),
      )
    : children;

  return (
    <HighlightContext.Provider
      value={{
        activeClassName: activeClassNameState,
        activeValue,
        className,
        clearBounds,
        click,
        disabled,
        enabled,
        exitDelay,
        forceUpdateBounds,
        hover,
        id,
        mode,
        setActiveClassName: setActiveClassNameState,
        setActiveValue: safeSetActiveValue,
        setBounds: safeSetBounds,
        style,
        transition,
      }}
    >
      {renderedContent}
    </HighlightContext.Provider>
  );
};

export { Highlight, HighlightItem, useHighlight, type HighlightItemProps, type HighlightProps };

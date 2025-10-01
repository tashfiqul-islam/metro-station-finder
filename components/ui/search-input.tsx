"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Props for the SearchInput component.
 * Extends native input props with search-specific functionality.
 */
export type SearchInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange"
> & {
  /** Callback triggered after debounce delay with search query */
  readonly onSearch?: (query: string) => void;
  /** Callback when clear button is clicked */
  readonly onClear?: () => void;
  /** Whether to show loading spinner */
  readonly loading?: boolean;
  /** Whether to display clear button when input has value */
  readonly showClearButton?: boolean;
  /** Debounce delay in milliseconds before triggering search */
  readonly debounceMs?: number;
  /** Change handler for controlled input */
  readonly onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

/**
 * Search input component with debouncing, loading states, and accessibility.
 * Automatically debounces user input to reduce unnecessary search operations.
 *
 * @example
 * ```tsx
 * <SearchInput
 *   onSearch={(query) => handleSearch(query)}
 *   placeholder="Search stations..."
 *   loading={isSearching}
 * />
 * ```
 */
export function SearchInput({
  className,
  type = "search",
  onSearch,
  onClear,
  loading = false,
  showClearButton = true,
  debounceMs = 300,
  ref,
  value: controlledValue,
  onChange: controlledOnChange,
  ...props
}: SearchInputProps & { ref?: React.Ref<HTMLInputElement> }) {
  const [internalValue, setInternalValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  // Determine if component is controlled or uncontrolled
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? String(controlledValue) : internalValue;

  // Debounce search to avoid excessive calls while user is typing
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (onSearch && value.trim()) {
      timeoutRef.current = setTimeout(() => {
        onSearch(value.trim());
      }, debounceMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, onSearch, debounceMs]);

  // Forward ref to allow parent components to access the input element
  useEffect(() => {
    if (ref && inputRef.current) {
      if (typeof ref === "function") {
        ref(inputRef.current);
      } else {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current =
          inputRef.current;
      }
    }
  }, [ref]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;

    if (!isControlled) {
      setInternalValue(newValue);
    }

    controlledOnChange?.(event);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue("");
    }

    onClear?.();
    inputRef.current?.focus();

    if (controlledOnChange) {
      const syntheticEvent = {
        target: { value: "" },
        currentTarget: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>;
      controlledOnChange(syntheticEvent);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClear();
    }
    props.onKeyDown?.(event);
  };

  const hasValue = value.length > 0;

  return (
    <div className="relative w-full" data-slot="search-input">
      {/* Input container with focus and hover states */}
      <div
        className={cn(
          "group relative flex items-center overflow-hidden rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm",
          "transition-all duration-200 ease-out",
          "hover:border-border hover:bg-background/80 hover:shadow-sm",
          "focus-within:border-primary focus-within:bg-background focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/20",
          isFocused &&
            "border-primary bg-background shadow-md ring-2 ring-primary/20",
          loading && "cursor-wait",
          props.disabled && "cursor-not-allowed opacity-60",
          className
        )}
      >
        {/* Search icon */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center"
        >
          <Search
            className={cn(
              "h-4 w-4 text-muted-foreground transition-colors duration-200",
              isFocused && "text-primary"
            )}
          />
        </div>

        {/* Input field */}
        <input
          aria-busy={loading}
          aria-describedby={`${id}-status`}
          aria-label={props["aria-label"] || "Search stations"}
          className={cn(
            "flex h-11 w-full rounded-xl border-0 bg-transparent px-10 py-2 text-sm",
            "text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-0",
            "disabled:cursor-not-allowed",
            "transition-colors duration-200",
            "selection:bg-primary/20 selection:text-foreground"
          )}
          id={id}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          onChange={handleChange}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onKeyDown={handleKeyDown}
          placeholder={props.placeholder || "Search stations..."}
          ref={inputRef}
          type={type}
          value={value}
        />

        {/* Loading indicator and clear button */}
        <div className="absolute right-2 flex items-center gap-1">
          {loading && (
            <output
              aria-label="Searching"
              aria-live="polite"
              className="flex items-center px-1"
              id={`${id}-status`}
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="sr-only">Searching...</span>
            </output>
          )}

          {showClearButton && hasValue && !loading && (
            <button
              aria-label="Clear search"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg",
                "text-muted-foreground transition-all duration-200",
                "hover:scale-110 hover:bg-accent hover:text-foreground",
                "active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              )}
              onClick={handleClear}
              tabIndex={-1}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Focus indicator */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-gradient-to-r from-transparent via-primary to-transparent transition-transform duration-300 ease-out",
            isFocused && "scale-x-100"
          )}
        />
      </div>

      {/* Screen reader status */}
      {!loading && (
        <output aria-live="polite" className="sr-only" id={`${id}-status`}>
          {hasValue
            ? `Showing results for: ${value}`
            : "Enter search terms to find stations"}
        </output>
      )}
    </div>
  );
}

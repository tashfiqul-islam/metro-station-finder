"use client";

import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Props for the SearchInput component.
 * Extends native input props with search-specific functionality.
 */
export type SearchInputProps = Omit<React.ComponentProps<"input">, "onChange"> & {
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
  /** Suggestions to display in listbox */
  readonly suggestions?: readonly string[];
  /** Callback when suggestion is selected */
  readonly onSuggestionSelect?: (suggestion: string) => void;
  /** Whether suggestions are currently loading */
  readonly suggestionsLoading?: boolean;
  /** Result count for live region announcement */
  readonly resultCount?: number;
};

/**
 * Custom hook for search input logic with enhanced performance
 */
function useSearchInput({
  controlledValue,
  controlledOnChange,
  onSearch,
  onClear,
  debounceMs,
  suggestions,
  onSuggestionSelect,
  ref,
}: {
  readonly controlledValue?: string | number | readonly string[] | undefined;
  readonly controlledOnChange?: ((event: React.ChangeEvent<HTMLInputElement>) => void) | undefined;
  readonly onSearch?: ((query: string) => void) | undefined;
  readonly onClear?: (() => void) | undefined;
  readonly debounceMs: number;
  readonly suggestions: readonly string[];
  readonly onSuggestionSelect?: ((suggestion: string) => void) | undefined;
  readonly ref?: React.Ref<HTMLInputElement> | undefined;
}) {
  const [internalValue, setInternalValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isListboxOpen, setIsListboxOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? String(controlledValue) : internalValue;

  // Simplified loading without competing transitions
  const deferredSuggestions = suggestions;

  // Simplified debounce search without competing transitions
  useEffect(() => {
    const timeoutId = timeoutRef.current;
    if (timeoutId) {
      clearTimeout(timeoutId);
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

  // Forward ref
  useEffect(() => {
    if (!(ref && inputRef.current)) {
      return;
    }

    if (typeof ref === "function") {
      ref(inputRef.current);
    } else {
      (ref as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current;
    }
  }, [ref]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;

      if (!isControlled) {
        setInternalValue(newValue);
      }

      controlledOnChange?.(event);
    },
    [isControlled, controlledOnChange]
  );

  const clearValue = useCallback(() => {
    if (!isControlled) {
      setInternalValue("");
    }
  }, [isControlled]);

  const triggerClearCallback = useCallback(() => {
    onClear?.();
    inputRef.current?.focus();
  }, [onClear]);

  const triggerControlledChange = useCallback(() => {
    if (controlledOnChange) {
      const syntheticEvent = {
        target: { value: "" },
        currentTarget: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>;
      controlledOnChange(syntheticEvent);
    }
  }, [controlledOnChange]);

  const handleClear = useCallback(() => {
    clearValue();
    triggerClearCallback();
    triggerControlledChange();
  }, [clearValue, triggerClearCallback, triggerControlledChange]);

  const handleSuggestionSelect = useCallback(
    (suggestion: string) => {
      if (!isControlled) {
        setInternalValue(suggestion);
      }
      onSuggestionSelect?.(suggestion);
      setIsListboxOpen(false);
      setActiveSuggestionIndex(-1);
      inputRef.current?.focus();
    },
    [isControlled, onSuggestionSelect]
  );

  const handleArrowDown = useCallback(() => {
    if (suggestions.length > 0) {
      setIsListboxOpen(true);
      setActiveSuggestionIndex(0);
    }
  }, [suggestions.length]);

  const handleArrowUp = useCallback(() => {
    if (suggestions.length > 0) {
      setIsListboxOpen(true);
      setActiveSuggestionIndex(suggestions.length - 1);
    }
  }, [suggestions.length]);

  const handleEnter = useCallback(() => {
    if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
      handleSuggestionSelect(suggestions[activeSuggestionIndex]);
    }
  }, [activeSuggestionIndex, suggestions, handleSuggestionSelect]);

  const handleEscape = useCallback(() => {
    handleClear();
    setIsListboxOpen(false);
    setActiveSuggestionIndex(-1);
  }, [handleClear]);

  const handleKeyDown = useCallback(
    (
      keyboardEvent: React.KeyboardEvent<HTMLInputElement>,
      onKeyDownCallback?: (event: React.KeyboardEvent<HTMLInputElement>) => void
    ) => {
      switch (keyboardEvent.key) {
        case "Escape":
          keyboardEvent.preventDefault();
          handleEscape();
          break;
        case "ArrowDown":
          keyboardEvent.preventDefault();
          handleArrowDown();
          break;
        case "ArrowUp":
          keyboardEvent.preventDefault();
          handleArrowUp();
          break;
        case "Enter":
          keyboardEvent.preventDefault();
          handleEnter();
          break;
        default:
          break;
      }
      onKeyDownCallback?.(keyboardEvent);
    },
    [handleEscape, handleArrowDown, handleArrowUp, handleEnter]
  );

  return {
    value,
    isFocused,
    isListboxOpen,
    activeSuggestionIndex,
    inputRef,
    id,
    handleChange,
    handleClear,
    handleKeyDown,
    handleSuggestionSelect,
    setIsFocused,
    deferredSuggestions,
  };
}

/**
 * Search icon component
 */
function SearchIcon({ isFocused }: { readonly isFocused: boolean }) {
  return (
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
  );
}

/**
 * Loading and clear buttons component
 */
function ActionButtons({
  loading,
  hasValue,
  showClearButton,
  onClear,
  id,
}: {
  readonly loading: boolean;
  readonly hasValue: boolean;
  readonly showClearButton: boolean;
  readonly onClear: () => void;
  readonly id: string;
}) {
  return (
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
          onClick={onClear}
          tabIndex={-1}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Input container component
 */
function InputContainer({
  className,
  isFocused,
  loading,
  disabled,
  children,
}: {
  readonly className?: string | undefined;
  readonly isFocused: boolean;
  readonly loading: boolean;
  readonly disabled?: boolean | undefined;
  readonly children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center overflow-hidden rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm",
        "transition-all duration-200 ease-out",
        "hover:border-border hover:bg-background/80 hover:shadow-sm",
        "focus-within:border-primary focus-within:bg-background focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/20",
        isFocused && "border-primary bg-background shadow-md ring-2 ring-primary/20",
        loading && "cursor-wait",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Suggestions listbox component
 */
function SuggestionsListbox({
  suggestions,
  activeIndex,
  onSelect,
  onKeyDown,
}: {
  readonly suggestions: readonly string[];
  readonly activeIndex: number;
  readonly onSelect: (suggestion: string) => void;
  readonly onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      aria-label="Search suggestions"
      className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border/50 bg-background shadow-lg"
      role="listbox"
    >
      {suggestions.map((suggestion, index) => (
        <button
          aria-selected={index === activeIndex}
          className={cn(
            "w-full cursor-pointer px-4 py-2 text-left text-sm transition-colors",
            "hover:bg-accent focus:bg-accent focus:outline-none",
            index === activeIndex && "bg-accent"
          )}
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          onKeyDown={onKeyDown}
          role="option"
          tabIndex={-1}
          type="button"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

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
  suggestions = [],
  onSuggestionSelect,
  suggestionsLoading = false,
  resultCount,
  ...props
}: SearchInputProps & { ref?: React.Ref<HTMLInputElement> }) {
  const {
    value,
    isFocused,
    isListboxOpen,
    activeSuggestionIndex,
    inputRef,
    id,
    handleChange,
    handleClear,
    handleKeyDown,
    handleSuggestionSelect,
    setIsFocused,
    deferredSuggestions,
  } = useSearchInput({
    controlledValue,
    controlledOnChange,
    onSearch,
    onClear,
    debounceMs,
    suggestions,
    onSuggestionSelect,
    ref,
  });

  const hasValue = value.length > 0;

  return (
    <div className="relative w-full" data-slot="search-input">
      <InputContainer
        className={className}
        disabled={props.disabled}
        isFocused={isFocused}
        loading={loading}
      >
        <SearchIcon isFocused={isFocused} />

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
          onKeyDown={(e) => handleKeyDown(e, props.onKeyDown)}
          placeholder={props.placeholder || "Search stations..."}
          ref={inputRef}
          suppressHydrationWarning
          type={type}
          value={value}
        />

        <ActionButtons
          hasValue={hasValue}
          id={id}
          loading={loading}
          onClear={handleClear}
          showClearButton={showClearButton}
        />

        {/* Focus indicator */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-linear-to-r from-transparent via-primary to-transparent transition-transform duration-300 ease-out",
            isFocused && "scale-x-100"
          )}
        />
      </InputContainer>

      {/* Suggestions listbox */}
      {isListboxOpen && deferredSuggestions.length > 0 && (
        <SuggestionsListbox
          activeIndex={activeSuggestionIndex}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              const suggestion = deferredSuggestions[activeSuggestionIndex];
              if (suggestion) {
                handleSuggestionSelect(suggestion);
              }
            }
          }}
          onSelect={handleSuggestionSelect}
          suggestions={deferredSuggestions}
        />
      )}

      {/* Live region for result count announcements */}
      <output aria-live="polite" className="sr-only" id={`${id}-status`}>
        {loading && "Searching..."}
        {!loading && suggestionsLoading && "Loading suggestions..."}
        {(() => {
          const isNotLoading = !loading;
          const isNotSuggestionsLoading = !suggestionsLoading;
          const isReady = isNotLoading && isNotSuggestionsLoading;
          const hasResults = resultCount !== undefined;
          const hasNoResults = resultCount === undefined;

          if (isReady && hasResults) {
            return `${resultCount} ${resultCount === 1 ? "result" : "results"} found`;
          }
          if (isReady && hasNoResults && hasValue) {
            return `Showing results for: ${value}`;
          }
          if (isReady && hasNoResults && !hasValue) {
            return "Enter search terms to find stations";
          }
          return null;
        })()}
      </output>
    </div>
  );
}

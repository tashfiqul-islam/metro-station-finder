"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/app/_components/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/shared/ui/card";
import { SearchInput } from "@/app/_components/shared/ui/search-input";
import { useCustomLoading } from "@/lib/hooks/loading/use-custom-loading";
import { useDeferredSearch } from "@/lib/hooks/performance/use-deferred-search";
import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";
import { searchStations } from "@/lib/services/actions/station-actions";
import type { Station } from "@/lib/types/station";

const searchSchema = z.object({
  query: z.string().min(2, "Query must be at least 2 characters"),
});

/**
 * Client-side station search form with enhanced UX using TanStack Form
 * Compatible with static export
 */
export function StationSearchForm() {
  const [results, setResults] = useState<Station[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  // Enhanced hooks for better UX
  const { startPageTransition } = useViewTransitions();
  const { startLoading, completeLoading, isLoading: isCustomLoading } = useCustomLoading();

  // Deferred search for better performance
  const { deferredResults: deferredStations } = useDeferredSearch(searchQuery, results);

  const form = useForm({
    defaultValues: {
      query: "",
    },
    validators: {
      onChange: searchSchema,
    },
    onSubmit: ({ value }) => {
      // Start loading indicator
      startLoading("station-search", {
        message: `Searching for "${value.query}"...`,
        progress: 0,
      });

      // Use View Transitions for smooth search
      startPageTransition(() => {
        setError(undefined);

        const searchResult = searchStations(value.query);

        if (searchResult.error) {
          setError(searchResult.error);
          setResults([]);
          completeLoading("station-search", `Search failed: ${searchResult.error}`);
        } else {
          setResults(searchResult.results);
          completeLoading("station-search", `Found ${searchResult.results.length} stations`);
        }
      });
    },
  });

  // Watch for search query changes
  const watchedQuery = useStore(form.store, (state) => state.values.query);

  // Update search query when form value changes
  useMemo(() => {
    if (watchedQuery !== searchQuery) {
      setSearchQuery(watchedQuery || "");
    }
  }, [watchedQuery, searchQuery]);

  const handleReset = useCallback(() => {
    form.reset();
    setResults([]);
    setError(undefined);
    setSearchQuery("");
  }, [form]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Search Stations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="query">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <div className="space-y-2">
                  <SearchInput
                    aria-invalid={isInvalid}
                    loading={isCustomLoading}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Search for stations..."
                    resultCount={deferredStations.length}
                    value={field.state.value}
                  />
                  {isInvalid && field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-sm">{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              );
            }}
          </form.Field>

          <div className="flex space-x-2">
            <Button disabled={isCustomLoading} type="submit">
              {isCustomLoading ? "Searching..." : "Search"}
            </Button>
            <Button onClick={handleReset} type="button" variant="outline">
              Clear
            </Button>
          </div>
        </form>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">{error}</div>
        )}

        {deferredStations.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Search Results</h3>
            <div className="space-y-2">
              {deferredStations.map((station) => (
                <div className="rounded-lg border p-3 hover:bg-muted/50" key={station.id}>
                  <div className="font-medium">{station.name}</div>
                  <div className="text-muted-foreground text-sm">Line: {station.line}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

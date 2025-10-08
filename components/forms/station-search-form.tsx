"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { searchStations } from "@/lib/actions/station-actions";
import type { Station } from "@/lib/types/station";

const searchSchema = z.object({
  query: z.string().min(2, "Query must be at least 2 characters"),
});

type SearchFormData = z.infer<typeof searchSchema>;

/**
 * Client-side station search form
 * Compatible with static export
 */
export function StationSearchForm() {
  const [results, setResults] = useState<Station[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
  });

  const onSubmit = (data: SearchFormData) => {
    setIsLoading(true);
    setError(undefined);

    const searchResult = searchStations(data.query);

    if (searchResult.error) {
      setError(searchResult.error);
      setResults([]);
    } else {
      setResults(searchResult.results);
    }

    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Search Stations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <SearchInput
              {...register("query")}
              loading={isLoading}
              placeholder="Search for stations..."
              resultCount={results.length}
            />
            {errors.query && (
              <p className="text-destructive text-sm">{errors.query.message}</p>
            )}
          </div>

          <div className="flex space-x-2">
            <Button disabled={isLoading} type="submit">
              {isLoading ? "Searching..." : "Search"}
            </Button>
            <Button
              onClick={() => {
                reset();
                setResults([]);
                setError(undefined);
              }}
              type="button"
              variant="outline"
            >
              Clear
            </Button>
          </div>
        </form>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Search Results</h3>
            <div className="space-y-2">
              {results.map((station) => (
                <div
                  className="rounded-lg border p-3 hover:bg-muted/50"
                  key={station.id}
                >
                  <div className="font-medium">{station.name}</div>
                  <div className="text-muted-foreground text-sm">
                    Line: {station.line}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

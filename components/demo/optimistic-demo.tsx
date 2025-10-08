"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MRT6_STATIONS } from "@/lib/data/stations";
import { useOptimisticDemo } from "@/lib/hooks/use-optimistic-demo";
import type { Station } from "@/lib/types/station";

/**
 * Demo component showcasing React 19's useOptimistic hook
 * Demonstrates instant UI feedback with optimistic updates
 */
const DEMO_CONSTANTS = {
  simulationDelayMs: 1000,
  maxDisplayStations: 5,
} as const;

export function OptimisticDemo() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStations, setSelectedStations] = useState<Station[]>([]);

  const {
    optimisticStations,
    optimisticQuery,
    isPending,
    addStationOptimistically,
    updateQueryOptimistically,
  } = useOptimisticDemo(selectedStations);

  const handleAddStation = (station: Station) => {
    // Optimistically add station for instant feedback
    addStationOptimistically(station);

    // Simulate async operation
    setTimeout(() => {
      setSelectedStations((prev) => [...prev, station]);
    }, DEMO_CONSTANTS.simulationDelayMs);
  };

  const handleSearchChange = (query: string) => {
    // Optimistically update query for instant feedback
    updateQueryOptimistically(query);
    setSearchQuery(query);
  };

  const filteredStations = MRT6_STATIONS.filter(
    (station) =>
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.aliases.some((alias) =>
        alias.toLowerCase().includes(searchQuery.toLowerCase())
      )
  ).slice(0, DEMO_CONSTANTS.maxDisplayStations);

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Optimistic Search Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="search">
              Search Stations (with optimistic updates)
            </label>
            <Input
              id="search"
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Type to search stations..."
              value={searchQuery}
            />
            {isPending && (
              <Badge className="text-xs" variant="secondary">
                Updating optimistically...
              </Badge>
            )}
          </div>

          {optimisticQuery && (
            <div className="text-muted-foreground text-sm">
              Optimistic query: "{optimisticQuery}"
            </div>
          )}
        </CardContent>
      </Card>

      {/* Station Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Available Stations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredStations.map((station) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={station.id}
              >
                <div>
                  <div className="font-medium">{station.name}</div>
                  <div className="text-muted-foreground text-sm">
                    {station.line} • Station #{station.order}
                  </div>
                </div>
                <Button
                  disabled={isPending}
                  onClick={() => handleAddStation(station)}
                  size="sm"
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimistic Results */}
      <Card>
        <CardHeader>
          <CardTitle>Selected Stations (Optimistic)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {optimisticStations.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No stations selected yet. Add some stations above to see
                optimistic updates!
              </p>
            ) : (
              optimisticStations.map((station, index) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3"
                  key={`${station.id}-${index}`}
                >
                  <div>
                    <div className="font-medium">{station.name}</div>
                    <div className="text-muted-foreground text-sm">
                      {station.line} • Station #{station.order}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {index < selectedStations.length
                      ? "Confirmed"
                      : "Optimistic"}
                  </Badge>
                </div>
              ))
            )}
          </div>

          {isPending && (
            <div className="mt-4 text-center">
              <Badge variant="secondary">
                Processing optimistic updates...
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

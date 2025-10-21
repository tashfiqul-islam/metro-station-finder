"use client";

import { MapPin } from "lucide-react";
import { memo, useCallback } from "react";
import { Button } from "@/app/_components/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/_components/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/_components/shared/ui/popover";
import { useRouterSelect } from "@/lib/hooks/navigation/use-router-select";
import type { Station } from "@/lib/types/station";

type StationSelectorProps = {
  readonly stations: readonly Station[];
  readonly selectedStation: Station | null;
  readonly placeholder: string;
  readonly searchValue: string;
  readonly onSearchChange: (value: string) => void;
  readonly onStationSelect: (station: Station) => void;
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly queryParamName: string;
};

/**
 * Station selector component with Router Select pattern integration.
 * Synchronizes station selection with URL query parameters for better UX.
 */
export const StationSelectorWithRouter = memo(
  ({
    stations,
    selectedStation,
    placeholder,
    searchValue,
    onSearchChange,
    onStationSelect,
    isOpen,
    onOpenChange,
    queryParamName,
  }: StationSelectorProps) => {
    const { optimisticOrigin, optimisticDestination, isPending, selectOrigin, selectDestination } =
      useRouterSelect();

    const handleStationSelect = useCallback(
      (station: Station) => {
        // Update local state immediately
        onStationSelect(station);

        // Update URL with station ID based on query param name
        if (queryParamName === "origin") {
          selectOrigin(station);
        } else if (queryParamName === "destination") {
          selectDestination(station);
        }
      },
      [onStationSelect, selectOrigin, selectDestination, queryParamName]
    );

    // Clear function for future use
    // const _handleClear = useCallback(() => {
    //   clearSelections();
    //   // Clear local state as well
    //   onStationSelect(null as Station | null);
    // }, [clearSelections, onStationSelect]);

    return (
      <Popover onOpenChange={onOpenChange} open={isOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={isOpen}
            className="w-full justify-start"
            role="combobox"
            variant="outline"
          >
            <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            {selectedStation ? (
              <span className="truncate">{selectedStation.name}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {isPending && (
              <div className="ml-auto h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
          sideOffset={4}
        >
          <Command>
            <CommandInput
              onValueChange={onSearchChange}
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={searchValue}
            />
            <CommandEmpty>No stations found</CommandEmpty>
            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandGroup>
                {stations.map((station) => (
                  <CommandItem
                    key={station.id}
                    onSelect={() => handleStationSelect(station)}
                    value={station.id}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{station.name}</span>
                      <span className="text-muted-foreground text-xs">{station.line}</span>
                    </div>
                    {((queryParamName === "origin" && optimisticOrigin === station.id) ||
                      (queryParamName === "destination" && optimisticDestination === station.id)) &&
                      isPending && (
                        <div className="ml-auto h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                      )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

StationSelectorWithRouter.displayName = "StationSelectorWithRouter";

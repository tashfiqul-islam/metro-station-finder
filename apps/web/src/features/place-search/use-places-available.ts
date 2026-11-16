import { useMaps } from "../../adapters/maps/context";
import { useOnline } from "../nearest-station/use-online";

/**
 * Whether place suggestions can be asked for (METRO-163): the browser reports a connection and Maps did not fail
 * to load (or has no key). Stations never depend on it: the field works with this false. `online` is returned too,
 * because the notice says "offline" or "unavailable".
 */
export function usePlacesAvailable(): { readonly available: boolean; readonly online: boolean } {
  const { status } = useMaps();
  const online = useOnline();
  return { available: online && status !== "unavailable", online };
}

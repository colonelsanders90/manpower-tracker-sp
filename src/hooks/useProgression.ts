import { useQuery } from "@tanstack/react-query";
import { dataAccess } from "@/lib/dataAccess";
import type { ProgressionListItem } from "@/types/progression";

export const PROGRESSION_KEY = ["progression"] as const;

export function useProgression() {
  return useQuery({
    queryKey: PROGRESSION_KEY,
    queryFn: async (): Promise<ProgressionListItem[]> =>
      dataAccess.getProgression(),
    staleTime: 5 * 60_000,
  });
}

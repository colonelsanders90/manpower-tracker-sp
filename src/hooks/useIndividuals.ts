import { useQuery } from "@tanstack/react-query";
import { spGetAll } from "@/lib/sharepoint";
import type { IndividualListItem } from "@/types/individuals";
import { INDIVIDUALS_LIST } from "@/types/individuals";
import { mockStore } from "@/lib/mockStore";

export const INDIVIDUALS_KEY = ["individuals"] as const;

export function useIndividuals() {
  return useQuery({
    queryKey: INDIVIDUALS_KEY,
    queryFn: async (): Promise<IndividualListItem[]> => {
      if (import.meta.env.DEV) return mockStore.getIndividuals();
      return spGetAll<IndividualListItem>(
        `/lists/getbytitle('${INDIVIDUALS_LIST}')/items?$orderby=Title`,
      );
    },
    staleTime: 5 * 60_000,
  });
}

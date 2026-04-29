import { useQuery } from "@tanstack/react-query";
import { spGetAll } from "@/lib/sharepoint";
import type { UnitListItem } from "@/types/units";
import { UNITS_LIST } from "@/types/units";
import { mockStore } from "@/lib/mockStore";

export const UNITS_KEY = ["units"] as const;

export function useUnits() {
  return useQuery({
    queryKey: UNITS_KEY,
    queryFn: async (): Promise<UnitListItem[]> => {
      if ((import.meta.env.MODE !== 'production')) return mockStore.getUnits();
      // $expand the self-referential ParentUnit so we get { Id, Title }
      // rather than just ParentUnitId.
      return spGetAll<UnitListItem>(
        `/lists/getbytitle('${UNITS_LIST}')/items?$expand=ParentUnit&$orderby=Title`,
      );
    },
    staleTime: 5 * 60_000,
  });
}

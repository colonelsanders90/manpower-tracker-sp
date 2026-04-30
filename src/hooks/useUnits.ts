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
      // SP 2013 requires explicit $select when using $expand on lookup fields.
      return spGetAll<UnitListItem>(
        `/lists/getbytitle('${UNITS_LIST}')/items?$select=*,ParentUnit/Id,ParentUnit/Title&$expand=ParentUnit&$orderby=Title`,
      );
    },
    staleTime: 5 * 60_000,
  });
}

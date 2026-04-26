import { useQuery } from "@tanstack/react-query";
import { spGetAll } from "@/lib/sharepoint";
import type { RoleListItem } from "@/types/roles";
import { ROLES_LIST } from "@/types/roles";
import { MOCK_ROLES } from "@/lib/mockData";

export const ROLES_KEY = ["roles"] as const;

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: async (): Promise<RoleListItem[]> => {
      if (import.meta.env.DEV) return MOCK_ROLES;
      return spGetAll<RoleListItem>(
        `/lists/getbytitle('${ROLES_LIST}')/items?$expand=Unit&$orderby=Title`,
      );
    },
    staleTime: 5 * 60_000,
  });
}

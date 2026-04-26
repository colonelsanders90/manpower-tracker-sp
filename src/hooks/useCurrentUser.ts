import { useQuery } from "@tanstack/react-query";
import { spGet, type CurrentUser } from "@/lib/sharepoint";

export const CURRENT_USER_KEY = ["currentUser"] as const;

/**
 * Returns the SP current user. In dev (no SP server), returns a stubbed admin
 * so the UI can be inspected.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: async (): Promise<CurrentUser> => {
      if (import.meta.env.DEV) {
        return {
          Id: 1,
          Title: "Dev User, HR Officer, RAiD",
          LoginName: "i:0#.w|DEV\\dev",
          Email: "dev@example.local",
          IsSiteAdmin: true,
          PrincipalType: 1,
        } as CurrentUser;
      }
      return spGet<CurrentUser>("/web/currentuser");
    },
    staleTime: 5 * 60_000,
  });
}

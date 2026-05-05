import { useQuery } from "@tanstack/react-query";
import { dataAccess } from "@/lib/dataAccess";
import type { RoaCourseListItem } from "@/types/roaCourses";

export const ROA_COURSES_KEY = ["roaCourses"] as const;

export function useRoaCourses() {
  return useQuery({
    queryKey: ROA_COURSES_KEY,
    queryFn: async (): Promise<RoaCourseListItem[]> => {
      const raw = await dataAccess.getRoaCourses();
      // SP returns multi-choice as { results: [...] } via REST. Normalise to
      // a plain string[] so consumers don't have to care about transport shape.
      // The mock store already returns plain arrays — this is a no-op there.
      return raw.map((c) => ({
        ...c,
        Profiles: Array.isArray(c.Profiles)
          ? c.Profiles
          : ((c as unknown as { Profiles: { results: typeof c.Profiles } })
              .Profiles?.results ?? []),
      }));
    },
    staleTime: 5 * 60_000,
  });
}

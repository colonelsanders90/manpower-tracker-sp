import { useQuery } from "@tanstack/react-query";
import { spGetAll } from "@/lib/sharepoint";
import type { PostingListItem } from "@/types/postings";
import { POSTINGS_LIST } from "@/types/postings";
import { MOCK_POSTINGS } from "@/lib/mockData";

export const POSTINGS_KEY = ["postings"] as const;

export function usePostings() {
  return useQuery({
    queryKey: POSTINGS_KEY,
    queryFn: async (): Promise<PostingListItem[]> => {
      if (import.meta.env.DEV) return MOCK_POSTINGS;
      // spGetAll handles the 5,000-item threshold per the workspace CLAUDE.md.
      return spGetAll<PostingListItem>(
        `/lists/getbytitle('${POSTINGS_LIST}')/items?$expand=Individual,Role&$orderby=StartDate`,
      );
    },
    staleTime: 5 * 60_000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { dataAccess } from "@/lib/dataAccess";
import type { CourseAttendanceListItem } from "@/types/courseAttendance";

export const COURSE_ATTENDANCE_KEY = ["courseAttendance"] as const;

export function useCourseAttendance() {
  return useQuery({
    queryKey: COURSE_ATTENDANCE_KEY,
    queryFn: async (): Promise<CourseAttendanceListItem[]> =>
      dataAccess.getCourseAttendance(),
    staleTime: 5 * 60_000,
  });
}

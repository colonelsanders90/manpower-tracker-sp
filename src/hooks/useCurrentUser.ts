import { useQuery } from "@tanstack/react-query";
import { spGet, type CurrentUser } from "@/lib/sharepoint";

export const CURRENT_USER_KEY = ["currentUser"] as const;

type EffectivePerms = {
  EffectiveBasePermissions: { High: string; Low: string };
};

/**
 * Returns the SP current user. IsSiteAdmin is true if the user is a site
 * collection administrator OR has the ManageLists permission (i.e. site owner /
 * Full Control / Design). This avoids requiring site collection admin rights
 * just to use the HR admin features on a subsite.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: async (): Promise<CurrentUser> => {
      if ((import.meta.env.MODE !== 'production')) {
        return {
          Id: 1,
          Title: "Dev User, HR Officer, RAiD",
          LoginName: "i:0#.w|DEV\\dev",
          Email: "dev@example.local",
          IsSiteAdmin: true,
          PrincipalType: 1,
        } as CurrentUser;
      }

      const [user, perms] = await Promise.all([
        spGet<CurrentUser>("/web/currentuser"),
        spGet<EffectivePerms>("/web/effectivebasepermissions"),
      ]);

      // ManageLists (0x800) is granted by Full Control, Design, and Manage
      // Hierarchy — i.e. any site owner-level role. Regular contributors and
      // readers do NOT have it.
      const low = parseInt(perms.EffectiveBasePermissions.Low, 10);
      const hasManageLists = (low & 0x800) !== 0;

      return { ...user, IsSiteAdmin: user.IsSiteAdmin || hasManageLists };
    },
    staleTime: 5 * 60_000,
  });
}

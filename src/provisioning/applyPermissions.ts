// src/provisioning/applyPermissions.ts
//
// Baseline permission helper for list provisioning. Call at the END of every
// list's provisioner, after all columns have been added.
//
// Rules:
//   - Data lists (users read/write their own records)        → 'Contribute'
//   - Reference/dimension lists (admin-managed, read-only)   → 'Read'
//
// Site owners/admins retain Full Control because breakRoleInheritance is
// called with copyExisting = true, which copies the parent web's existing
// role assignments before breaking inheritance.
//
// Non-fatal: permission failure must NOT abort provisioning. The list is
// still usable; an admin can set permissions manually. Failure is recorded
// in the diagnostic log.

import { breakPermissionInheritance, grantListPermission } from '../lib/jsom'
import { log } from '../lib/diagnosticLog'

// AD group covering all intranet users (confirmed working in this environment).
// Double-backslash is the JS escape for a literal backslash —
// the string sent to SP is 'MINDEF\domain users'.
const AUTHENTICATED_USERS = 'MINDEF\\domain users'

export async function applyPermissions(
  listTitle: string,
  roleType: 'Read' | 'Contribute',
): Promise<void> {
  try {
    await breakPermissionInheritance(listTitle, true)
    await grantListPermission(listTitle, AUTHENTICATED_USERS, roleType)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log(
      'warn',
      `Permission grant failed for ${listTitle} (${roleType}) — set manually in SharePoint admin`,
      message,
    )
  }
}

// Usage in provisioningSequence.ts:
//
// {
//   name: 'MY_LIST',
//   provision: async () => {
//     await createList('MY_LIST', '')
//     await addTextField('MY_LIST', 'SOME_FIELD')
//     await applyPermissions('MY_LIST', 'Contribute') // ← always last
//   },
// }

// Tells TypeScript that SP is loaded globally by /_layouts/15/sp.js
declare const SP: any

export function isJsomAvailable(): boolean {
  try { return typeof SP !== 'undefined' } catch { return false }
}

// Lazily injects a list of scripts in strict dependency order.
// Skips any script already present in the DOM. Returns a promise that
// resolves once all scripts have loaded.
function loadScripts(srcs: string[]): Promise<void> {
  return srcs.reduce<Promise<void>>(
    (chain, src) =>
      chain.then(
        () =>
          new Promise<void>((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
              resolve()
              return
            }
            const s = document.createElement('script')
            s.src = src
            s.onload = () => resolve()
            s.onerror = () => reject(new Error(`Failed to load ${src}`))
            document.head.appendChild(s)
          }),
      ),
    Promise.resolve(),
  )
}

// Core JSOM — MicrosoftAjax + SP runtime + SP JSOM core.
// Required for list management, permissions, and most JSOM operations.
// clienttemplates.js and friends are intentionally excluded — they call
// InitListViewStrings() which references a `Strings` global that only
// exists in a full SharePoint master-page context, not a standalone HTML.
let jsomCorePromise: Promise<void> | null = null

export function loadJsom(): Promise<void> {
  if (jsomCorePromise) return jsomCorePromise
  jsomCorePromise = loadScripts([
    '/_layouts/15/MicrosoftAjax.js',
    '/_layouts/15/sp.runtime.js',
    '/_layouts/15/sp.js',
  ])
  return jsomCorePromise
}

// People-picker JSOM — extends core with the ClientPeoplePicker namespace.
// Load this (after loadJsom()) only when the AD people picker is needed.
// Requires init.js → clienttemplates.js → autofill.js → clientforms.js →
// clientpeoplepicker.js in strict order.
let jsomPeoplePickerPromise: Promise<void> | null = null

export function loadJsomPeoplePicker(): Promise<void> {
  if (jsomPeoplePickerPromise) return jsomPeoplePickerPromise
  jsomPeoplePickerPromise = loadJsom().then(() =>
    loadScripts([
      '/_layouts/15/init.js',
      '/_layouts/15/clienttemplates.js',
      '/_layouts/15/autofill.js',
      '/_layouts/15/clientforms.js',
      '/_layouts/15/clientpeoplepicker.js',
    ]),
  )
  return jsomPeoplePickerPromise
}

// Promisify SP's callback-based executeQueryAsync
export function executeQuery(ctx: any): Promise<void> {
  return new Promise((resolve, reject) => {
    ctx.executeQueryAsync(
      () => resolve(),
      (_: any, args: any) => reject(new Error(args.get_message()))
    )
  })
}

// SP.ClientContext.get_current() binds to the current page's SharePoint web.
// Do NOT use new SP.ClientContext(window.location.origin) — that targets the
// root site collection, which will cause "Access denied" or "does not exist"
// errors when the app is deployed in a subsite or document library.
export function getContext(): any {
  return SP.ClientContext.get_current()
}

// Returns the server-relative URL of the current web, e.g. '/rsaf/RDO/devtools/spatest'.
// Call this once at app startup and pass the result to setApiBase() in sharepoint.ts
// so that REST calls target the same subsite as JSOM's get_current().
export async function getWebServerRelativeUrl(): Promise<string> {
  const ctx = getContext()
  const web = ctx.get_web()
  ctx.load(web, 'ServerRelativeUrl')
  await executeQuery(ctx)
  return web.get_serverRelativeUrl() as string
}

// ── List Management ──────────────────────────────────────────────────────────

export async function createList(
  title: string,
  description = '',
  templateType = 100 // 100 = generic custom list
): Promise<void> {
  const ctx = getContext()
  const listInfo = new SP.ListCreationInformation()
  listInfo.set_title(title)
  listInfo.set_description(description)
  listInfo.set_templateType(templateType)
  ctx.get_web().get_lists().add(listInfo)
  await executeQuery(ctx)
}

export async function deleteList(title: string): Promise<void> {
  const ctx = getContext()
  ctx.get_web().get_lists().getByTitle(title).deleteObject()
  await executeQuery(ctx)
}

// ── Column Management ────────────────────────────────────────────────────────

export async function addFieldAsXml(
  listTitle: string,
  fieldXml: string
): Promise<void> {
  const ctx = getContext()
  const list = ctx.get_web().get_lists().getByTitle(listTitle)
  list.get_fields().addFieldAsXml(
    fieldXml,
    true,
    SP.AddFieldOptions.addFieldToDefaultView
  )
  await executeQuery(ctx)
}

// Convenience wrappers for common field types
export const addTextField = (listTitle: string, name: string, required = false) =>
  addFieldAsXml(listTitle, `<Field Type="Text" DisplayName="${name}" Required="${required}" />`)

// Multi-line plain-text (no rich text). Use for longer free-form fields like
// notes, descriptions, or rationale where the 255-char limit of "Text" is too tight.
export const addNoteField = (listTitle: string, name: string, required = false) =>
  addFieldAsXml(
    listTitle,
    `<Field Type="Note" DisplayName="${name}" Required="${required}" NumLines="6" RichText="FALSE" />`,
  )

export const addNumberField = (listTitle: string, name: string, required = false) =>
  addFieldAsXml(listTitle, `<Field Type="Number" DisplayName="${name}" Required="${required}" />`)

export const addDateField = (listTitle: string, name: string, required = false) =>
  addFieldAsXml(listTitle, `<Field Type="DateTime" DisplayName="${name}" Required="${required}" />`)

export const addChoiceField = (listTitle: string, name: string, choices: string[], required = false) =>
  addFieldAsXml(listTitle, `
    <Field Type="Choice" DisplayName="${name}" Required="${required}">
      <CHOICES>${choices.map(c => `<CHOICE>${c}</CHOICE>`).join('')}</CHOICES>
    </Field>
  `)

export const addBooleanField = (listTitle: string, name: string, required = false) =>
  addFieldAsXml(listTitle, `<Field Type="Boolean" DisplayName="${name}" Required="${required}" />`)

// ── Permission Management ────────────────────────────────────────────────────

export async function breakPermissionInheritance(
  listTitle: string,
  copyExisting = true
): Promise<void> {
  const ctx = getContext()
  ctx.get_web().get_lists().getByTitle(listTitle).breakRoleInheritance(copyExisting, false)
  await executeQuery(ctx)
}

export async function grantListPermission(
  listTitle: string,
  loginName: string,
  roleType: 'Read' | 'Contribute' | 'FullControl'
): Promise<void> {
  // Step 1: resolve the user
  const ctx1 = getContext()
  const user = ctx1.get_web().ensureUser(loginName)
  ctx1.load(user)
  await executeQuery(ctx1)

  // Step 2: assign role
  const ctx2 = getContext()
  const roleTypeMap: Record<string, any> = {
    Read: SP.RoleType.reader,
    Contribute: SP.RoleType.contributor,
    FullControl: SP.RoleType.administrator,
  }
  const roleDefinition = ctx2.get_web().get_roleDefinitions().getByType(roleTypeMap[roleType])
  const bindings = SP.RoleDefinitionBindingCollection.newObject(ctx2)
  bindings.add(roleDefinition)
  ctx2.get_web().get_lists().getByTitle(listTitle)
    .get_roleAssignments().add(user, bindings)
  await executeQuery(ctx2)
}

// Grants a list permission to a SP site group (not a user).
export async function grantListPermissionToGroup(
  listTitle: string,
  groupName: string,
  roleType: 'Read' | 'Contribute' | 'FullControl'
): Promise<void> {
  const ctx = getContext()
  const roleTypeMap: Record<string, any> = {
    Read: SP.RoleType.reader,
    Contribute: SP.RoleType.contributor,
    FullControl: SP.RoleType.administrator,
  }
  const group = ctx.get_web().get_siteGroups().getByName(groupName)
  const roleDefinition = ctx.get_web().get_roleDefinitions().getByType(roleTypeMap[roleType])
  const bindings = SP.RoleDefinitionBindingCollection.newObject(ctx)
  bindings.add(roleDefinition)
  ctx.get_web().get_lists().getByTitle(listTitle)
    .get_roleAssignments().add(group, bindings)
  await executeQuery(ctx)
}

// ── Group Management ─────────────────────────────────────────────────────────

export async function spGroupExists(groupName: string): Promise<boolean> {
  try {
    const ctx = getContext()
    const group = ctx.get_web().get_siteGroups().getByName(groupName)
    ctx.load(group, 'Id')
    await executeQuery(ctx)
    return true
  } catch {
    return false
  }
}

export async function createSpGroup(
  groupName: string,
  description = ''
): Promise<void> {
  const ctx = getContext()
  const groupInfo = new SP.GroupCreationInformation()
  groupInfo.set_title(groupName)
  groupInfo.set_description(description)
  const web = ctx.get_web()
  web.get_siteGroups().add(groupInfo)
  await executeQuery(ctx)
}

// Adds the child SP group as a member of the parent SP group.
// Idempotent — if the relationship already exists SP silently accepts it.
export async function nestGroupInGroup(
  parentGroupName: string,
  childGroupName: string
): Promise<void> {
  // Step 1: load the child group's LoginName (claim format)
  const ctx1 = getContext()
  const childGroup = ctx1.get_web().get_siteGroups().getByName(childGroupName)
  ctx1.load(childGroup, 'LoginName')
  await executeQuery(ctx1)
  const childLoginName = childGroup.get_loginName() as string

  // Step 2: ensureUser the child group's principal, then add to parent
  const ctx2 = getContext()
  const parentGroup = ctx2.get_web().get_siteGroups().getByName(parentGroupName)
  const childPrincipal = ctx2.get_web().ensureUser(childLoginName)
  parentGroup.get_users().addUser(childPrincipal)
  await executeQuery(ctx2)
}

export interface GroupMember {
  loginName: string
  displayName: string
}

export async function getGroupMembers(groupName: string): Promise<GroupMember[]> {
  const ctx = getContext()
  const group = ctx.get_web().get_siteGroups().getByName(groupName)
  const users = group.get_users()
  ctx.load(users, 'Include(LoginName,Title,PrincipalType)')
  await executeQuery(ctx)
  const result: GroupMember[] = []
  const enumerator = users.getEnumerator()
  while (enumerator.moveNext()) {
    const u = enumerator.get_current()
    // PrincipalType 8 = SP group — exclude nested groups from the member list UI
    if (u.get_principalType() !== 8) {
      result.push({ loginName: u.get_loginName(), displayName: u.get_title() })
    }
  }
  return result
}

export async function addUserToSpGroup(
  groupName: string,
  loginName: string
): Promise<void> {
  const ctx = getContext()
  const group = ctx.get_web().get_siteGroups().getByName(groupName)
  const user = ctx.get_web().ensureUser(loginName)
  group.get_users().addUser(user)
  await executeQuery(ctx)
}

export async function removeUserFromSpGroup(
  groupName: string,
  loginName: string
): Promise<void> {
  const ctx = getContext()
  const group = ctx.get_web().get_siteGroups().getByName(groupName)
  group.get_users().removeByLoginName(loginName)
  await executeQuery(ctx)
}

// Deletes a SP site group. Safe to call when the group does not exist — the
// "Group cannot be found" error is silently swallowed so callers can treat a
// missing group as already-deleted.
export async function deleteSpGroup(groupName: string): Promise<void> {
  const ctx = getContext()
  ctx.get_web().get_siteGroups().removeByLoginName(groupName)
  try {
    await executeQuery(ctx)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes('Group cannot be found') && !msg.includes('does not exist')) throw err
  }
}

export interface SiteUser {
  loginName: string
  displayName: string
  email: string
}

// Fetches all users known to the site. SP 2013 searchPrincipals() is broken in
// this environment — use siteUsers instead and filter client-side in UI.
export async function getSiteUsers(): Promise<SiteUser[]> {
  const ctx = getContext()
  const users = ctx.get_web().get_siteUsers()
  ctx.load(users, 'Include(LoginName,Title,Email,PrincipalType)')
  await executeQuery(ctx)
  const result: SiteUser[] = []
  const enumerator = users.getEnumerator()
  while (enumerator.moveNext()) {
    const u = enumerator.get_current()
    // Only include actual users (PrincipalType 1), not groups or claims
    if (u.get_principalType() === 1) {
      result.push({
        loginName: u.get_loginName(),
        displayName: u.get_title(),
        email: u.get_email() ?? '',
      })
    }
  }
  return result
}

// ── People Picker / AD Search ─────────────────────────────────────────────────

// Searches the full SharePoint user directory (AD-backed) using the People Picker
// web service. Unlike getSiteUsers() which returns only users already provisioned
// to this site, searchUsers() queries Active Directory directly and can find any
// user in the organisation by partial name, login name, or email.
//
// Requires clientpeoplepicker.js and its dependencies loaded in index.html.
// Returns an empty array (never throws) if the query string is empty.

export interface PrincipalResult {
  key: string          // SP claim key, e.g. 'i:0#.w|DOMAIN\username'
  displayText: string  // display name shown in UI
  description: string  // typically email or login name
  entityType: string   // 'User', 'SecGroup', 'SPGroup', etc.
}

export function searchUsers(
  queryString: string,
  maxSuggestions = 50,
  principalType = 1,   // Users only
  principalSource = 15 // All sources
): Promise<PrincipalResult[]> {
  return new Promise((resolve, reject) => {
    if (!queryString.trim()) { resolve([]); return }

    if (
      typeof SP?.UI?.ApplicationPages?.ClientPeoplePickerWebServiceInterface === 'undefined' ||
      typeof SP?.UI?.ApplicationPages?.ClientPeoplePickerQueryParameters === 'undefined'
    ) {
      reject(new Error(
        'ClientPeoplePicker namespace not available. ' +
        'Ensure init.js, clienttemplates.js, autofill.js, clientforms.js, ' +
        'and clientpeoplepicker.js are loaded in index.html before the Vite bundle.'
      ))
      return
    }

    const ctx = getContext()
    const query = new SP.UI.ApplicationPages.ClientPeoplePickerQueryParameters()
    query.set_allowMultipleEntities(false)
    query.set_maximumEntitySuggestions(maxSuggestions)
    query.set_principalType(principalType)
    query.set_principalSource(principalSource)
    query.set_queryString(queryString)

    const result = SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface
      .clientPeoplePickerSearchUser(ctx, query)

    ctx.executeQueryAsync(
      () => {
        try {
          const raw = result.get_value()
          const parsed: any[] = JSON.parse(raw)
          resolve(
            parsed.map(p => ({
              key: p.Key ?? '',
              displayText: p.DisplayText ?? '',
              description: p.Description ?? '',
              entityType: p.EntityType ?? '',
            }))
          )
        } catch (e) {
          reject(new Error(`Failed to parse People Picker response: ${e}`))
        }
      },
      (_: any, args: any) => reject(new Error(args.get_message()))
    )
  })
}

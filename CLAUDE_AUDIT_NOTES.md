# Audit notes on this package (read before deploying)

This zip was reviewed file-by-file against a known-clean earlier copy of this
repo before being handed back. Two things need your decision before this goes
to production; everything else checked out as safe.

## 🔴 Needs your decision: permission engine was modified

`src/lib/client-permissions.ts` — two real logic changes, not cosmetic:

1. Business Unit matching changed from an exact string match to a
   fuzzy/substring + acronym-in-parentheses match. Likely necessary because
   client records use short codes ("SCA") while employee records use full
   names ("Supply Chain, Finance & System Advisory (SCA)") — an exact match
   would never succeed between the two.
2. The Business Unit Head check now also honors the `isBusinessUnitHead`
   boolean flag, not just an exact `designation === "Business Unit Head"`
   string match — needed so people like a CEO who is *also* flagged as a BU
   Head (e.g. for a specific business unit) aren't wrongly denied access.

Both look like genuine, probably-necessary fixes given how the employee and
client data were actually built — but they are changes to the one file every
prior instruction in this project said must never be touched. Decide
explicitly whether to keep this fix or revert it and solve the
acronym/flag mismatch a different way before this goes live.

## 🟡 Also modified: Approval Engine

`src/routes/client-approvals.tsx` now filters the pending-approvals list
using the already-existing `canApproveClient()` function, so a user only
sees approvals they can actually act on. Reuses existing logic rather than
inventing new rules, but is still a change to a file marked off-limits.

## 🟢 Reviewed and safe (additive / cosmetic only)
- `StatusBadge.tsx` — optional tooltip, backward-compatible.
- `documents.ts` — 2 new software category options, purely additive.
- `teams.tsx` — conditionally hides a text label on one tab only; no
  access-control logic touched. (Note: this was implemented without the
  stakeholder discussion originally recommended for this specific feedback
  item — low technical risk, but flagging that the process step was skipped.)
- `TeamOwnershipDialog.tsx` — dropdown filtering only, doesn't grant or
  restrict any real access.
- `client-visibility.ts` — only new helper functions added; nothing existing
  was changed.
- `src/db/schema.ts` — confirmed byte-for-byte identical to the original.
  No database structure changes at all.

## 🔴 Removed from this package before sending to you
- `.env` — contained real (local) database credentials. Excluded on
  principle; recreate it locally from `.env.example`.
- `src/db/reset-db.ts` — ran `DROP SCHEMA public CASCADE`, which deletes the
  entire database with no confirmation prompt. Excluded rather than ship a
  one-command full data wipe inside a production deliverable. Re-add it
  yourself if you actually want it, ideally renamed and guarded so it can't
  be run against production by accident.

## ⚠️ Hard blocker for the client import specifically
`src/scripts/data/clients-import-data.csv` currently contains ZERO client
data rows — only a header row and a stray blank line. A leftover
`src/scripts/csv-analysis-results.json` shows a real 75-row file was
analyzed at some earlier point (with a slightly different header — "Client
Name" instead of the current "Company Name"). That data is not in this
file anymore. Do not run `import-production-clients.ts` for real until
you've confirmed where the real 75 rows went and restored them — run
`--dry-run` first regardless, and read its output before a real run.

---

# Update: Actions column visibility + Contract filter + Filtered count

Implemented directly on this codebase (src/routes/clients.tsx only, plus
this notes file). No other files changed for this round.

## 1. Files modified
- `src/routes/clients.tsx` — only file changed.

## 2. Root cause analysis
No "Permission Management module" exists anywhere in this codebase —
confirmed by searching the entire src/ tree. All access control is
hardcoded in `src/lib/client-permissions.ts`, re-exported via
`src/lib/client-visibility.ts`. Building a real dynamic permission system
would require schema/architecture changes explicitly ruled out by the same
spec that asked for "Permission Management"-driven behavior — so this
reuses the existing functions instead of inventing new infrastructure.

The Actions `<TableCell>` previously always rendered; its four buttons
were already individually gated by `canEditCompanyInfo`, `canSubmitClient`,
`canAssignTeamLead`, `canManageDeliveryTeam`. The only missing piece was a
column-level (not per-row) check to hide the header + cell entirely.

## 3. Permission mapping used
`userCanSeeClientActions = getClientRole(user)` is one of:
`"Finance Head"`, `"Marketing Head"`, `"Business Unit Head"`, `"Team Lead"`.

**Important, verified discrepancy — not fixed, flagged instead:** none of
the four existing button-gating functions ever grant access to CEO,
Managing Director, or Admin. `isClientSuperUser` exists in
`client-permissions.ts` as a concept but isn't wired into any of these
four functions. So under this faithful implementation, CEO/MD/Admin will
also see the Actions column hidden — same as a plain Employee — which
technically satisfies "hide if no actions available" (true for them
today) but contradicts the spec's stated list of who should see it.
Resolving this requires deciding whether CEO/MD/Admin should gain real
edit/submit/assign/manage rights (a change to the underlying functions,
explicitly out of scope for this task) or whether their access belongs
elsewhere entirely (e.g. Client360, not this specific action set).
**This needs an explicit decision before shipping to anyone with those
three roles.**

## 4. Contract filter — mapping caveat
`contractType` in real data only ever holds `"Recurring"` or `"One-off"`
(see `src/lib/documents.ts`) — there is no literal `"Renewal"` value
anywhere. Implemented as:
- "Renewal" → any client with a `contractRenewalDate` set at all.
- "Auto Recurring" → `contractType === "Recurring"`.
- "Expiring in 3 / 6 months" → computed from `contractRenewalDate` vs.
  today's date (90 / 180 day windows) — this part has no ambiguity.
If "Renewal" was meant to mean something more specific, only that one
mapping needs adjusting — the rest is unaffected.

## 5. Filtered count
Added "— Showing X of Y" next to the existing summary line, appearing
only when a filter or search term is active. The original "active /
pending approval" breakdown is untouched.

## 6. Validation
- No changes made to any permission-check function's actual logic — only
  read from them.
- No changes to schema, auth, approval workflow, hierarchy, or BU routing.
- Syntax-checked in isolation (no real TypeScript errors; only expected
  noise from missing node_modules in this review environment). **You
  still need to run `npx tsc --noEmit` and `npm run build` yourself in
  your real environment with dependencies installed** — this could not be
  done from here.
- Not tested against a live login as any specific role — recommend
  logging in as a Team Lead, a Business Unit Head, and a plain Employee
  to visually confirm the column appears/disappears as expected, and
  as CEO/MD/Admin to see the (currently expected, per #3 above) hidden
  column and decide if that's acceptable.

---

# Update: Approval status ("Under Review" etc.) hover tooltip

Added a hover tooltip to the Approval column badge (`c.recordStatus`),
mirroring the existing Status column tooltip pattern (same file,
`src/routes/clients.tsx`, no other files touched).

There is no dedicated "reason for review" field in the schema — this
shows what's actually available instead of inventing a reason:
- Approval Status, Submitted/Last Action By (`lastUpdatedBy` or
  `createdBy`), Last Action Date (`updatedAt`) — shown always.
- If Approved: `approvedBy` / `approvedAt`.
- If Rejected or Sent Back for Correction: `rejectionCorrectionNotes` as
  the "Reason".
- If Under Review specifically: a static line "Awaiting Business Unit
  Head approval," since that's the actual meaning of that state in this
  workflow — not a fabricated per-client reason.

No changes to the approval workflow logic itself, only to what's
displayed on hover. Syntax-checked clean; still needs `npx tsc --noEmit`
and `npm run build` run in your real environment.

---

# Fix: tooltip clipping on Status and Approval columns

Both hover tooltips were anchored `left-0` (extending rightward from the
badge). Since both columns sit near the right edge of a wide table, and
the table's outer wrapper has `overflow-x-auto` for horizontal scrolling,
the right side of each tooltip was being clipped/cut off — confirmed from
a screenshot showing "Submitted / Last A..." and "Awaiting Business U..."
truncated.

Fix: both tooltips now anchor `right-0` (extending leftward from the
badge) instead, keeping them within already-visible table content rather
than overflowing past the scroll container's edge. Same file only
(`src/routes/clients.tsx`), no logic changes — positioning only.

---

# Real fix: replaced hand-rolled tooltips with the actual Tooltip component

The `right-0` repositioning fixed horizontal clipping but not vertical —
the first table row's tooltip (which pops up *above* the trigger) had no
room above it inside the scrollable container and got clipped at the top.
Repositioning again would have just moved the problem to a different edge
case (e.g. the last row, or a narrow window).

Root cause: both tooltips were hand-rolled `absolute`-positioned divs
inside the table's `overflow-x-auto` container, which clips anything that
extends past its bounds in any direction.

Real fix: replaced both with the project's actual `Tooltip` /
`TooltipTrigger` / `TooltipContent` / `TooltipProvider` components from
`src/components/ui/tooltip.tsx` (already a real dependency —
`@radix-ui/react-tooltip` is already in package.json, already used by
`StatusBadge.tsx`). This renders via a React Portal outside the table's
DOM hierarchy entirely, with built-in collision detection that
automatically flips the tooltip's side based on available viewport space
— so it can't clip regardless of which row or column it's in. This is a
correctness fix, not just a style tweak; no logic/content changes, same
fields shown as before.

Only `src/routes/clients.tsx` changed (one new import line + the two
tooltip blocks refactored).

---

# Added: Edit option inside the Client360 popup

Verified first: the Client360 popup had ZERO edit capability anywhere in
it — editing only existed via the Client List's Actions column "Edit"
button. That's the gap this fills.

**No permission scope was changed.** The new Edit button in Client360
reuses the exact same `canEditCompanyInfo(user, client)` check already
used by the List's Edit button — today that means Finance Head or
Marketing Head, and only for records they created/last touched, only
while the record is Draft or Sent Back for Correction. If you actually
want Finance Head to edit clients they DIDN'T create, or edit
Approved/Under Review records, that's a different, bigger change to
`canEditClient` in `src/lib/client-permissions.ts` itself — say so if
that's what you meant, since "add an edit option" could mean either
"the button doesn't exist" (what I built) or "the existing rule is too
narrow" (not built, needs your confirmation first).

## Architecture note
Client360Dialog is rendered once globally (in `src/lib/workspace.tsx`),
while the edit form's state (`editing`, `showForm`, etc.) lives locally in
`src/routes/clients.tsx` — there's no shared state between them. Rather
than lifting that form state into the global workspace context (a much
bigger, riskier change), clicking Edit in the popup closes it and
navigates to `/clients?edit=<clientId>`; a new effect in `clients.tsx`
picks up that param, opens the edit form for the matching client (after
re-checking the same permission function — a user could theoretically
type the URL manually, so this isn't just a UI-level gate), and clears
the param so refreshing doesn't re-trigger it.

## Files modified
- `src/components/shared/Client360Dialog.tsx` — added the Edit button.
- `src/routes/clients.tsx` — added `validateSearch` for `?edit=`, and the
  effect that opens the edit form from it.

No changes to any permission function's logic, the schema, or the
approval workflow.

---

# Added: Client Delete/Restore + Client History + Pending Renewal pages

## Schema change — explicit, confirmed exception
Added two nullable columns to `clients` in `src/db/schema.ts`:
`deletedAt` (timestamp), `deletedBy` (text). This is the one real schema
change in this whole project, done only after you explicitly confirmed
you wanted a true delete flag rather than reusing the existing
"Non Active" status. **You'll need to run your migration step
(`npm run db:push` or generate+run a migration) — I cannot do this from
here.** Both columns are nullable and additive; nothing existing was
altered.

## Files modified
- `src/db/schema.ts` — the two new columns.
- `src/lib/documents.ts` — `ClientRecord` type gains `deletedAt`/`deletedBy`.
- `src/api/mappers.ts` — `toClient()` maps the two new columns through.
- `src/lib/client-permissions.ts` — new `canDeleteClient(user, client?)`:
  CEO/MD/Admin (org-wide) or Business Unit Head (matching BU). Team Lead
  excluded by default — flag me if you want it included.
- `src/lib/client-visibility.ts` — re-exports `canDeleteClient`, same
  pattern as every other permission function here.
- `src/api/clients.mutations.ts` — two **new, separate** mutations,
  `deleteClientFn` / `restoreClientFn`. Deliberately not reusing
  `updateClientFn` — that one is gated by `canEditCompanyInfo` (Finance/
  Marketing Head, own drafts only), which is the wrong scope for delete
  and would have been a real permission bug if reused.
- `src/lib/workspace.tsx` — `deleteClient()` / `restoreClient()`, wired
  the same way as the existing `updateClient()`.
- `src/routes/clients.tsx`:
  - Deleted clients are now excluded from the main list entirely (new
    `visibleClients` derived list feeds the table, counts, and header).
  - Added a Delete button to the Actions cell, gated by `canDeleteClient`,
    with a confirm step explaining it's reversible via Client History.
  - `userCanSeeClientActions` now also checks `canDeleteClient(user)` —
    this incidentally fixes the earlier-flagged gap where CEO/MD/Admin
    saw the Actions column hidden entirely (they now have a real action).
- `src/components/shell/Sidebar.tsx` — added "Client History" and
  "Pending Renewal" nav entries under the Client section, and added both
  routes to the same visibility rules as `/clients` itself (full access
  for Leadership/Admin/BU Heads; Finance/Marketing Heads also see them).

## New files
- `src/routes/client-history.tsx` — lists all soft-deleted clients
  (`deletedAt` set), showing who deleted them and when, with a Restore
  button (same `canDeleteClient` gate).
- `src/routes/pending-renewal.tsx` — lists clients whose
  `contractRenewalDate` is more than 90 days in the past ("beyond 3
  months," confirmed as overdue, not upcoming). **Design decision worth
  reviewing:** clients are NOT removed from the main Client List by
  appearing here — this is a filtered report, not a second holding area,
  since nothing in the request said to hide them from the main list too.
  The action button opens the full Client360 popup rather than an inline
  date-editor, because directly editing an Approved client's renewal date
  would bypass the existing Change Request requirement for Approved
  records (`canEditClient`'s rule) — I didn't want to build a shortcut
  around that rule. If you actually want a quick inline date update here,
  that's a bigger decision about whether/how to extend the Change Request
  workflow to this page specifically, not something to guess at.

## Known limitation, flagged not fixed
Team Lead is excluded from `canDeleteClient`. The original Actions-column
spec said "Team Lead (if permitted)" with no real permission system to
resolve "if permitted" against — same ambiguity as before, resolved the
same conservative way.

## Verification
All 11 touched/new files syntax-checked clean in isolation (same caveat
as always: no real `node_modules` in this sandbox, so `npx tsc --noEmit`
and `npm run build` still need to be run for real in your environment —
and this time, so does the actual database migration for the schema
change before any of this will run against a real database).

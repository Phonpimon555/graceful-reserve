<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Enforce the single-owner administrator restriction in the protected role RPC and role-write trigger; new signups receive only a customer role. This prevents client bypasses and unverified-email privilege escalation.

- Existing `/admin` content routes validate the Cloud Auth user and protected `has_role` RPC before loading with SSR disabled; `/admin/login` stays public, and customer GAS authentication remains separate. This preserves published URLs and prevents protected page mounting before role validation.

- Customer auth and table booking run on the Google Apps Script + Google Sheets API (`src/lib/auth/gasAuth.ts`, `src/lib/gasBooking.ts`), not Supabase — the owner manages data in Sheets, so do not route customer login/register/booking/history/cancel flows through Supabase tables. Supabase remains only for the admin back office and as a temporary fallback for the table map until the Apps Script `tables` action is deployed.

- Admin reservation hide/restore/delete uses `reservations.is_archived` guarded by database triggers (only admins may change it; only cancelled/completed rows may be hidden or deleted; new rows always start visible). Keeping the rule in the database means direct API calls cannot bypass the UI checks.

- The admin dashboard reads Google Sheets bookings only through admin-verified server functions (`src/lib/sheet-bookings.functions.ts`) that call Apps Script admin actions with the server-only `ADMIN_API_KEY`; hiding a sheet row is stored in `sheet_booking_hidden`, never by editing the sheet. This keeps the key out of the browser and keeps Sheets the single source of booking data.

- Apps Script admin replies are interpreted only by the pure helpers in `src/lib/sheet-bookings.ts` (`classifyGasAdminReply`, `interpretStatusUpdateReply`, `statusUpdateWarnings`): a script-supplied `code` always wins and its message is shown verbatim, key errors are recognised only by the script's exact messages, and a confirmed booking change with a failed table update is a success plus a separate warning. Guessing from message words mislabelled real write errors as key mismatches.

- Admin sheet status changes unlock (buttons and server function alike, via `canRequestStatusChange`) only when the `get_bookings` reply has `can_update_status === true` and the row carries a valid sheet row number; the script's `version` field is informational and never used as a gate. The live older script sends neither field, so nothing can be written until the new script is deployed.

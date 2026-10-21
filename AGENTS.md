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

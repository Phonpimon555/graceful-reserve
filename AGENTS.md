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

- Customer auth and table booking run on the Google Apps Script + Google Sheets API (`src/lib/auth/gasAuth.ts`, `src/lib/gasBooking.ts`), not Supabase — the owner manages data in Sheets, so do not route customer login/register/booking/history/cancel flows through Supabase tables. Supabase remains only for the admin back office and as a temporary fallback for the table map until the Apps Script `tables` action is deployed.

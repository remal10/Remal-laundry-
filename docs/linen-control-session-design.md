# Linen Control — session design (draft only)

## Status
This document is a proposal. It does not deploy an Edge Function, change Supabase settings, change database schema/RLS, or wire the frontend.

## Decision
Keep a staff session after PIN login. Do not trust `localStorage.remal_current_staff` as authentication or authorization.

## Proposed request flow
1. A staff member submits the PIN to a dedicated login operation on the Linen Control Edge Function.
2. The function checks the PIN against exactly one active `laundry_staff` row.
3. The function issues a short-lived, cryptographically signed bearer token containing only the staff ID, issued-at time, expiry, and token purpose. The signing secret must be a server-side Supabase secret and must never be shipped to the browser.
4. The browser keeps the token only in memory where practical (not localStorage); reload may require login unless a reviewed persistence approach is selected.
5. Each Linen Control request sends the token, not the PIN. The function verifies the signature, purpose, and expiry, then reloads the staff row by ID and confirms the account is still active. The current database role is checked for every privileged operation.
6. The server authorizes each operation independently: list requires an active staff session; create/delete require current admin role. Browser UI checks are convenience only.
7. Logout clears the browser token. Expiry should be short (proposed 30 minutes); a later change may add idle timeout and revocation.

## Required safeguards before implementation
- Confirm Preview uses an isolated Supabase project/database and separate secrets. This is currently unverified; the Vercel environment inspection was denied.
- Use a dedicated signing secret with adequate entropy, configured only on the intended Preview function; never use the service-role key as the token-signing key.
- Reject malformed, expired, wrong-purpose, and tampered tokens.
- Add PIN attempt throttling / abuse protection before exposing PIN login.
- Restrict CORS to the exact approved application origin(s), rather than wildcard, once the Preview origin is confirmed.
- Never log PINs, bearer tokens, or secret values.
- Ensure the function requires the expected gateway JWT setting, and do not confuse the gateway's project API JWT with the staff session token.
- Keep the Supabase service-role key server-side only.
- Handle logout, expiry, inactive staff, role changes, network errors, and duplicate PIN matches safely.

## Test plan (not yet run)
- Valid active staff PIN logs in; invalid, inactive, empty, oversized, and duplicate PINs fail.
- Valid staff session can list; cannot create or delete.
- Valid admin session can create/delete only with valid payload and existing sheet ID.
- Expired, malformed, altered, and wrong-purpose tokens fail.
- Deactivated staff and downgraded admin role lose access immediately.
- Invalid payloads, unknown operations, and missing rows return safe errors.
- Frontend never authorizes based only on localStorage; PIN/token/secret are not logged.
- Run automated checks and end-to-end tests against isolated Preview data only.

## Release gate
Do not merge PR #6 or deploy the function until Preview database isolation is verified, the implementation and tests are reviewed, and frontend wiring is included in a separate reviewed change. No production database, RLS, or production deployment changes are authorized by this draft.

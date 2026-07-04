# Full account deletion — Edge Function setup (backlog D4)

This closes the last data-rights gap. The app already deletes a user's *data*; this adds deletion of the **auth identity itself**, which the app cannot do (it needs the `service_role` key, which must never ship in a client).

Analogy: the app can empty your apartment, but only the building manager can erase your name from the tenancy register. This Edge Function is that manager — it lives on the server, holds the master key, and verifies it's really you before erasing your record.

## How it works
1. The app calls `POST /functions/v1/delete-account` with the signed-in user's access token.
2. The function verifies the token → gets the user id.
3. It deletes all the user's rows, then calls `auth.admin.deleteUser()` to remove the identity.
4. The app signs out. If the function is ever unreachable, the app falls back to data-only deletion so the button always works.

## Deploy (one-time)

Requires the Supabase CLI (`npm i -g supabase`) and that you've linked the project once (`supabase link --project-ref nebkqncvapelrarruyqb`).

```
# from the backend folder that contains  functions/delete-account/index.ts
supabase functions deploy delete-account --project-ref nebkqncvapelrarruyqb
```

That's it. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the Supabase Edge runtime — **you do not set them, and the key never leaves the server.**

## Verify
- In Supabase → **Edge Functions**, `delete-account` shows as deployed.
- In the app: Settings → Data Privacy → **Delete account** → confirm. The account should be gone from **Authentication → Users** (not just its data).

## Security notes
- The function only ever deletes the **caller's own** account (id comes from their verified token — a user can't pass someone else's id).
- CORS is open so the web app can call the same endpoint; the token check is the real gate.
- Never paste the `service_role` key into the app, `.env`, or any client file. This function is the only place it's used, and Supabase supplies it at runtime.
